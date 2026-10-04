"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, Member, Message, Note, PresenceMeta, Profile, Role, Room } from "@/lib/types";

type Connection = "connecting" | "live" | "offline";

interface RoomContextValue {
  room: Room;
  me: Profile;
  role: Role;
  canEdit: boolean;
  members: Member[];
  profiles: Record<string, Profile>;
  messages: ChatMessage[];
  notes: Note[];
  addNote: (n: Note) => void;
  removeNote: (id: string) => void;
  online: PresenceMeta[];
  typingNames: string[];
  connection: Connection;
  sendMessage: (body: string) => void;
  retryMessage: (id: string) => void;
  notifyTyping: () => void;
  setEditing: (noteId: string | null) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used inside <RoomProvider>");
  return ctx;
}

const byCreated = (a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at);

export function RoomProvider({
  room,
  me,
  role,
  initialMembers,
  initialMessages,
  initialNotes,
  children,
}: {
  room: Room;
  me: Profile;
  role: Role;
  initialMembers: Member[];
  initialMessages: Message[];
  initialNotes: Note[];
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const metaRef = useRef<PresenceMeta>({ user_id: me.id, name: me.display_name, color: me.avatar_color, editing: null, editing_since: null, online_at: Date.now() });
  const lastTypingSent = useRef(0);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fetchingProfiles = useRef<Set<string>>(new Set());

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [online, setOnline] = useState<PresenceMeta[]>([]);
  const [typing, setTyping] = useState<Record<string, string>>({});
  const [connection, setConnection] = useState<Connection>("connecting");
  const [profiles, setProfiles] = useState<Record<string, Profile>>(() => {
    const map: Record<string, Profile> = { [me.id]: me };
    for (const m of initialMembers) map[m.user_id] = m.profiles;
    return map;
  });

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

  const removeNote = useCallback((id: string) => setNotes((prev) => prev.filter((n) => n.id !== id)), []);

  const upsertNote = useCallback((n: Note) => {
    setNotes((prev) => {
      const existing = prev.find((x) => x.id === n.id);
      if (existing && existing.version > n.version) return prev;
      const next = existing ? prev.map((x) => (x.id === n.id ? n : x)) : [...prev, n];
      return next.sort(byCreated);
    });
  }, []);

  // One channel per room: Postgres Changes (durable), Presence (who's here), Broadcast (typing).
  useEffect(() => {
    let firstSubscribe = true;

    const resync = async () => {
      const [{ data: m }, { data: n }] = await Promise.all([
        supabase.from("messages").select("*").eq("room_id", room.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("notes").select("*").eq("room_id", room.id),
      ]);
      if (m) {
        const fresh = (m as Message[]).reverse();
        setMessages((prev) => {
          const ids = new Set(fresh.map((x) => x.id));
          return [...fresh, ...prev.filter((x) => !ids.has(x.id) && (x.pending || x.failed))].sort(byCreated);
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
        }
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
          if (!firstSubscribe) void resync(); // catch up on anything missed while offline
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
  }, [supabase, room.id, me.id, ensureProfile, upsertNote]);

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

  const value = useMemo<RoomContextValue>(
    () => ({
      room,
      me,
      role,
      canEdit: role === "owner" || role === "editor",
      members: initialMembers,
      profiles,
      messages,
      notes,
      addNote: upsertNote,
      removeNote,
      online,
      typingNames: Object.entries(typing)
        .filter(([id]) => id !== me.id)
        .map(([, n]) => n),
      connection,
      sendMessage,
      retryMessage,
      notifyTyping,
      setEditing,
    }),
    [room, me, role, initialMembers, profiles, messages, notes, upsertNote, removeNote, online, typing, connection, sendMessage, retryMessage, notifyTyping, setEditing],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
