"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import { removeMember as removeMemberAction, setDefaultRole as setDefaultRoleAction, setMemberRole } from "@/lib/actions/members";
import { useLocalFlag } from "@/lib/hooks/use-local-setting";
import { playMessageSound, primeAudio } from "@/lib/sounds";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, Member, Message, Note, PresenceMeta, Profile, Role, Room, RoomFile } from "@/lib/types";

type Connection = "connecting" | "live" | "offline";

interface RoomContextValue {
  room: Room;
  me: Profile;
  role: Role;
  canEdit: boolean;
  members: Member[];
  /** What new joiners get: "editor" (can edit) or "member" (can view). */
  defaultRole: "editor" | "member";
  /** Owner only. Change what one person can do. Resolves true on success. */
  changeMemberRole: (userId: string, role: "editor" | "member") => Promise<boolean>;
  /** Owner only. Remove someone from the room. */
  kickMember: (userId: string) => Promise<boolean>;
  /** Owner only. Set what people get when they join from now on. */
  changeDefaultRole: (role: "editor" | "member") => Promise<boolean>;
  profiles: Record<string, Profile>;
  messages: ChatMessage[];
  notes: Note[];
  addNote: (n: Note) => void;
  removeNote: (id: string) => void;
  files: RoomFile[];
  addFile: (f: RoomFile) => void;
  removeFile: (id: string) => void;
  online: PresenceMeta[];
  typingNames: string[];
  connection: Connection;
  sendMessage: (body: string) => void;
  retryMessage: (id: string) => void;
  editMessage: (id: string, body: string) => Promise<boolean>;
  deleteMessage: (id: string) => Promise<boolean>;
  /** True while older history exists that hasn't been loaded. */
  hasMoreMessages: boolean;
  loadingOlder: boolean;
  loadOlderMessages: () => Promise<void>;
  /** Messages from other people that arrived while the chat wasn't on screen. */
  unread: number;
  /** The chat panel tells the provider when it is actually visible, so unread counts and sounds stay honest. */
  setChatVisible: (visible: boolean) => void;
  chatMuted: boolean;
  setChatMuted: (muted: boolean) => void;
  notifyTyping: () => void;
  setEditing: (noteId: string | null) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used inside <RoomProvider>");
  return ctx;
}

const PAGE = 100;
const byCreated = (a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at);

export function RoomProvider({
  room,
  me,
  role: roleProp,
  initialMembers,
  initialMessages,
  initialNotes,
  initialFiles,
  children,
}: {
  room: Room;
  me: Profile;
  role: Role;
  initialMembers: Member[];
  initialMessages: Message[];
  initialNotes: Note[];
  initialFiles: RoomFile[];
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const roleRef = useRef<Role>(roleProp);
  const metaRef = useRef<PresenceMeta>({ user_id: me.id, name: me.display_name, color: me.avatar_color, editing: null, editing_since: null, online_at: Date.now() });
  const lastTypingSent = useRef(0);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fetchingProfiles = useRef<Set<string>>(new Set());

  const [role, setRole] = useState<Role>(roleProp);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [defaultRole, setDefaultRoleState] = useState<"editor" | "member">(room.default_role ?? "editor");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [hasMoreMessages, setHasMoreMessages] = useState(initialMessages.length >= PAGE);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [unread, setUnread] = useState(0);
  const [chatMuted, setChatMuted] = useLocalFlag("tuon-chat-muted", false);
  const mutedRef = useRef(chatMuted);
  const chatVisibleRef = useRef(false);
  const messagesRef = useRef(messages);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [files, setFiles] = useState<RoomFile[]>(initialFiles);
  const [online, setOnline] = useState<PresenceMeta[]>([]);
  const [typing, setTyping] = useState<Record<string, string>>({});
  const [connection, setConnection] = useState<Connection>("connecting");
  const [profiles, setProfiles] = useState<Record<string, Profile>>(() => {
    const map: Record<string, Profile> = { [me.id]: me };
    for (const m of initialMembers) map[m.user_id] = m.profiles;
    return map;
  });

  useEffect(() => {
    mutedRef.current = chatMuted;
  }, [chatMuted]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Browsers keep audio locked until the page has been clicked or typed in once.
  useEffect(() => {
    const unlock = () => primeAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const setChatVisible = useCallback((visible: boolean) => {
    chatVisibleRef.current = visible;
    if (visible && document.visibilityState === "visible") setUnread(0);
  }, []);

  // coming back to the tab with the chat open counts as reading it
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && chatVisibleRef.current) setUnread(0);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const ensureProfile = useCallback(
    async (userId: string) => {
      if (fetchingProfiles.current.has(userId)) return;
      fetchingProfiles.current.add(userId);
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (data) setProfiles((p) => ({ ...p, [userId]: data as Profile }));
    },
    [supabase],
  );

  useEffect(() => {
    for (const m of initialMessages) if (!profiles[m.user_id]) void ensureProfile(m.user_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFile = useCallback((f: RoomFile) => {
    setFiles((prev) => (prev.some((x) => x.id === f.id) ? prev : [f, ...prev]).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }, []);
  const removeFile = useCallback((id: string) => setFiles((prev) => prev.filter((f) => f.id !== id)), []);

  const removeNote = useCallback((id: string) => setNotes((prev) => prev.filter((n) => n.id !== id)), []);

  const upsertNote = useCallback((n: Note) => {
    setNotes((prev) => {
      const existing = prev.find((x) => x.id === n.id);
      if (existing && existing.version > n.version) return prev;
      const next = existing ? prev.map((x) => (x.id === n.id ? n : x)) : [...prev, n];
      return next.sort(byCreated);
    });
  }, []);

  // My own access changed (or I was taken out of the room). Tell me, and make the screen match.
  const applyMyRole = useCallback(
    (next: Role) => {
      const prev = roleRef.current;
      if (next === prev) return;
      roleRef.current = next;
      setRole(next);
      if (next === "member") toast("Your access changed to view only. You can still read and chat.");
      else if (prev === "member") toast.success("You can now edit notes and upload files.");
    },
    [],
  );

  /** The member list from the database is the truth. Also notices if I've been removed. */
  const refreshMembers = useCallback(async () => {
    const { data, error } = await supabase.from("room_members").select("user_id, role, profiles(*)").eq("room_id", room.id);
    if (error || !data) return;
    const list = data as unknown as Member[];
    if (!list.some((m) => m.user_id === me.id)) {
      toast.error(`You're no longer a member of ${room.name}.`);
      router.replace("/rooms");
      return;
    }
    setMembers(list);
    setProfiles((p) => {
      const next = { ...p };
      for (const m of list) next[m.user_id] = m.profiles;
      return next;
    });
    const mine = list.find((m) => m.user_id === me.id);
    if (mine) applyMyRole(mine.role);
  }, [supabase, room.id, room.name, me.id, router, applyMyRole]);

  /** Tell everyone in the room to re-read the member list (also how removals reach the person removed). */
  const announceMembers = useCallback(() => {
    void channelRef.current?.send({ type: "broadcast", event: "members", payload: {} });
  }, []);

  // One channel per room: Postgres Changes (durable), Presence (who's here), Broadcast (typing).
  useEffect(() => {
    let firstSubscribe = true;

    const resync = async () => {
      const [{ data: m }, { data: n }, { data: fl }] = await Promise.all([
        supabase.from("messages").select("*").eq("room_id", room.id).order("created_at", { ascending: false }).limit(PAGE),
        supabase.from("notes").select("*").eq("room_id", room.id),
        supabase.from("room_files").select("*").eq("room_id", room.id).order("created_at", { ascending: false }),
      ]);
      if (fl) setFiles(fl as RoomFile[]);
      if (m) {
        const fresh = (m as Message[]).reverse();
        setMessages((prev) => {
          const ids = new Set(fresh.map((x) => x.id));
          const oldest = fresh[0]?.created_at;
          // keep unsent messages, and older history the person already scrolled back to load
          const keep = prev.filter((x) => !ids.has(x.id) && (x.pending || x.failed || (oldest !== undefined && x.created_at < oldest)));
          return [...fresh, ...keep].sort(byCreated);
        });
      }
      if (n) setNotes((prev) => (n as Note[]).map((x) => prev.find((p) => p.id === x.id && p.version > x.version) ?? x).sort(byCreated));
    };

    const channel = supabase.channel(`room:${room.id}`, { config: { presence: { key: me.id }, broadcast: { self: false } } });
    channelRef.current = channel;

    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${room.id}` }, (payload) => {
        const m = payload.new as Message;
        setMessages((prev) => {
          if (prev.some((x) => x.id === m.id)) return prev.map((x) => (x.id === m.id ? { ...m } : x));
          return [...prev, m];
        });
        if (m.user_id !== me.id) {
          void ensureProfile(m.user_id);
          setTyping((t) => {
            const { [m.user_id]: _gone, ...rest } = t;
            return rest;
          });
          if (!mutedRef.current) playMessageSound();
          if (!chatVisibleRef.current || document.visibilityState !== "visible") setUnread((n) => n + 1);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `room_id=eq.${room.id}` }, (payload) => {
        const m = payload.new as Message;
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m, pending: false, failed: false } : x)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setMessages((prev) => prev.filter((x) => x.id !== id));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notes", filter: `room_id=eq.${room.id}` }, (p) => upsertNote(p.new as Note))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notes", filter: `room_id=eq.${room.id}` }, (p) => upsertNote(p.new as Note))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notes" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setNotes((prev) => prev.filter((x) => x.id !== id));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_files", filter: `room_id=eq.${room.id}` }, (p) => addFile(p.new as RoomFile))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "room_files" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setFiles((prev) => prev.filter((x) => x.id !== id));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_members", filter: `room_id=eq.${room.id}` }, () => void refreshMembers())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "room_members", filter: `room_id=eq.${room.id}` }, (payload) => {
        const row = payload.new as { user_id: string; role: Role };
        setMembers((prev) => prev.map((m) => (m.user_id === row.user_id ? { ...m, role: row.role } : m)));
        if (row.user_id === me.id) applyMyRole(row.role);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` }, (payload) => {
        const dr = (payload.new as { default_role?: "editor" | "member" }).default_role;
        if (dr) setDefaultRoleState(dr);
      })
      .on("broadcast", { event: "members" }, () => void refreshMembers())
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceMeta>();
        const list = Object.values(state).map((metas) => metas[metas.length - 1]);
        setOnline(list);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { user_id, name } = payload as { user_id: string; name: string };
        setTyping((t) => ({ ...t, [user_id]: name }));
        clearTimeout(typingTimers.current[user_id]);
        typingTimers.current[user_id] = setTimeout(() => {
          setTyping((t) => {
            const { [user_id]: _gone, ...rest } = t;
            return rest;
          });
        }, 3000);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setConnection("live");
          await channel.track(metaRef.current);
          if (!firstSubscribe) {
            void resync(); // catch up on anything missed while offline
            void refreshMembers();
          }
          firstSubscribe = false;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnection("offline");
        }
      });

    const timers = typingTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [supabase, room.id, me.id, ensureProfile, upsertNote, addFile, refreshMembers, applyMyRole]);

  const insertMessage = useCallback(
    async (id: string, body: string) => {
      const { error } = await supabase.from("messages").insert({ id, room_id: room.id, user_id: me.id, body });
      if (error) setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pending: false, failed: true } : m)));
    },
    [supabase, room.id, me.id],
  );

  const sendMessage = useCallback(
    (body: string) => {
      const text = body.trim();
      if (!text) return;
      const id = crypto.randomUUID();
      // Optimistic: show immediately, then the realtime echo (same id) confirms it.
      setMessages((prev) => [...prev, { id, room_id: room.id, user_id: me.id, body: text, created_at: new Date().toISOString(), pending: true }]);
      void insertMessage(id, text);
    },
    [insertMessage, room.id, me.id],
  );

  const retryMessage = useCallback(
    (id: string) => {
      const msg = messages.find((m) => m.id === id);
      if (!msg) return;
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pending: true, failed: false } : m)));
      void insertMessage(id, msg.body);
    },
    [messages, insertMessage],
  );

  /** Edit one of my messages. Shows the change at once and puts the old text back if the save fails. */
  const editMessage = useCallback(
    async (id: string, body: string) => {
      const text = body.trim();
      const before = messagesRef.current.find((m) => m.id === id);
      if (!before || !text) return false;
      if (text === before.body) return true;
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, body: text, edited_at: new Date().toISOString() } : m)));
      const { error } = await supabase.from("messages").update({ body: text }).eq("id", id);
      if (error) {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, body: before.body, edited_at: before.edited_at } : m)));
        toast.error("Couldn't save your edit. You can only edit your own messages.");
        return false;
      }
      return true;
    },
    [supabase],
  );

  /** Delete one of my messages for everyone. Removed at once; comes back if the delete is refused. */
  const deleteMessage = useCallback(
    async (id: string) => {
      const before = messagesRef.current.find((m) => m.id === id);
      if (!before) return false;
      setMessages((prev) => prev.filter((m) => m.id !== id));
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) {
        setMessages((prev) => (prev.some((m) => m.id === id) ? prev : [...prev, before].sort(byCreated)));
        toast.error("Couldn't delete that message. You can only delete your own messages.");
        return false;
      }
      return true;
    },
    [supabase],
  );

  const loadOlderMessages = useCallback(async () => {
    const oldest = messagesRef.current.find((m) => !m.pending && !m.failed);
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", room.id)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    setLoadingOlder(false);
    if (error || !data) return void toast.error("Couldn't load earlier messages.");
    const older = (data as Message[]).reverse();
    setHasMoreMessages(data.length >= PAGE);
    setMessages((prev) => {
      const ids = new Set(prev.map((x) => x.id));
      return [...older.filter((x) => !ids.has(x.id)), ...prev].sort(byCreated);
    });
    for (const m of older) if (!profiles[m.user_id]) void ensureProfile(m.user_id);
  }, [supabase, room.id, loadingOlder, profiles, ensureProfile]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current < 1800) return;
    lastTypingSent.current = now;
    void channelRef.current?.send({ type: "broadcast", event: "typing", payload: { user_id: me.id, name: me.display_name } });
  }, [me.id, me.display_name]);

  const setEditing = useCallback((noteId: string | null) => {
    const meta = metaRef.current;
    if (meta.editing === noteId) return;
    metaRef.current = { ...meta, editing: noteId, editing_since: noteId ? Date.now() : null };
    void channelRef.current?.track(metaRef.current);
  }, []);

  const changeMemberRole = useCallback(
    async (userId: string, next: "editor" | "member") => {
      const before = members.find((m) => m.user_id === userId)?.role;
      setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role: next } : m)));
      const res = await setMemberRole(room.id, userId, next);
      if (res.error) {
        if (before) setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role: before } : m)));
        toast.error(res.error);
        return false;
      }
      announceMembers();
      return true;
    },
    [members, room.id, announceMembers],
  );

  const kickMember = useCallback(
    async (userId: string) => {
      const res = await removeMemberAction(room.id, userId);
      if (res.error) {
        toast.error(res.error);
        return false;
      }
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      announceMembers();
      return true;
    },
    [room.id, announceMembers],
  );

  const changeDefaultRole = useCallback(
    async (next: "editor" | "member") => {
      const before = defaultRole;
      setDefaultRoleState(next);
      const res = await setDefaultRoleAction(room.id, next);
      if (res.error) {
        setDefaultRoleState(before);
        toast.error(res.error);
        return false;
      }
      return true;
    },
    [defaultRole, room.id],
  );

  const value = useMemo<RoomContextValue>(
    () => ({
      room,
      me,
      role,
      canEdit: role === "owner" || role === "editor",
      members,
      defaultRole,
      changeMemberRole,
      kickMember,
      changeDefaultRole,
      profiles,
      messages,
      notes,
      addNote: upsertNote,
      removeNote,
      files,
      addFile,
      removeFile,
      online,
      typingNames: Object.entries(typing)
        .filter(([id]) => id !== me.id)
        .map(([, n]) => n),
      connection,
      sendMessage,
      retryMessage,
      editMessage,
      deleteMessage,
      hasMoreMessages,
      loadingOlder,
      loadOlderMessages,
      unread,
      setChatVisible,
      chatMuted,
      setChatMuted,
      notifyTyping,
      setEditing,
    }),
    [room, me, role, members, defaultRole, changeMemberRole, kickMember, changeDefaultRole, profiles, messages, notes, upsertNote, removeNote, files, addFile, removeFile, online, typing, connection, sendMessage, retryMessage, editMessage, deleteMessage, hasMoreMessages, loadingOlder, loadOlderMessages, unread, setChatVisible, chatMuted, setChatMuted, notifyTyping, setEditing],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
