"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUp, Check, History, Loader2, MessageSquare, MoreHorizontal, PanelRightClose, Pencil, Trash2, Volume2, VolumeX, X } from "lucide-react";
import { cn, formatTime, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRoom } from "./room-provider";

const GROUP_MS = 5 * 60 * 1000;

/** Mute / unmute the notification sound for new messages. The choice is remembered on this device. */
export function MuteButton({ className }: { className?: string }) {
  const { chatMuted, setChatMuted } = useRoom();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={className}
          aria-pressed={chatMuted}
          aria-label={chatMuted ? "Unmute message sounds" : "Mute message sounds"}
          onClick={() => setChatMuted(!chatMuted)}
        >
          {chatMuted ? <VolumeX className="text-muted-foreground" /> : <Volume2 />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{chatMuted ? "Sounds off. Click to unmute" : "Sounds on. Click to mute"}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The room chat: send, read (with earlier history on demand), edit and delete your own messages.
 * `collapsible` adds a collapse button and must only be used inside a shadcn <Collapsible>.
 * `visible` is false while the panel is collapsed, so unread counts and sounds know nobody is looking.
 */
export function ChatPanel({ collapsible = false, visible = true }: { collapsible?: boolean; visible?: boolean }) {
  const { messages, profiles, me, sendMessage, retryMessage, editMessage, deleteMessage, hasMoreMessages, loadingOlder, loadOlderMessages, setChatVisible, notifyTyping, typingNames, online, room } = useRoom();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const anchor = useRef<number | null>(null); // scrollHeight before older messages were loaded

  useEffect(() => {
    setChatVisible(visible);
    return () => setChatVisible(false);
  }, [visible, setChatVisible]);

  // Keep the view pinned to the newest message unless the reader scrolled up, and don't jump when older ones load above.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    if (anchor.current !== null) {
      el.scrollTop += el.scrollHeight - anchor.current;
      anchor.current = null;
    } else if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, typingNames.length]);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (visible && el) el.scrollTop = el.scrollHeight; // back from collapsed (or hidden): show the latest
  }, [visible]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onScroll = () => {
      stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function submit() {
    if (!draft.trim()) return;
    stickToBottom.current = true;
    sendMessage(draft);
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  }

  async function loadEarlier() {
    anchor.current = viewportRef.current?.scrollHeight ?? null;
    await loadOlderMessages();
    requestAnimationFrame(() => (anchor.current = null));
  }

  function startEdit(id: string, body: string) {
    setEditingId(id);
    setEditDraft(body);
  }

  async function saveEdit() {
    if (!editingId) return;
    const id = editingId;
    const text = editDraft.trim();
    if (!text) return; // an empty message is a delete, which has its own button
    setEditingId(null);
    await editMessage(id, text);
  }

  const typingLabel =
    typingNames.length === 0 ? "" : typingNames.length === 1 ? `${typingNames[0]} is typing` : typingNames.length === 2 ? `${typingNames.join(" and ")} are typing` : "Several people are typing";
  const deletingMessage = messages.find((m) => m.id === deleting);

  return (
    <section aria-label="Chat" className="flex h-full min-h-0 flex-col bg-muted/30">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b bg-card/60 pr-2 pl-4">
        <MessageSquare className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Chat</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{online.length} online</span>
        <div className="ml-auto flex items-center gap-0.5">
          <MuteButton />
          {collapsible && (
            <Tooltip>
              <TooltipTrigger asChild>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Collapse chat">
                    <PanelRightClose />
                  </Button>
                </CollapsibleTrigger>
              </TooltipTrigger>
              <TooltipContent>Collapse chat</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1" viewportRef={viewportRef}>
        <div className="flex min-h-full flex-col justify-end gap-0.5 px-4 py-4">
          {hasMoreMessages && (
            <div className="mb-3 flex justify-center">
              <Button variant="outline" size="sm" onClick={loadEarlier} disabled={loadingOlder}>
                {loadingOlder ? <Loader2 className="animate-spin" /> : <History />}
                Load earlier messages
              </Button>
            </div>
          )}
          {messages.length === 0 && (
            <div className="my-auto py-16 text-center">
              <MessageSquare className="mx-auto size-8 text-muted-foreground/60" />
              <p className="mt-3 font-medium">No messages in {room.name} yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Say hello, or ask what everyone is stuck on.</p>
            </div>
          )}
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const grouped = prev && prev.user_id === m.user_id && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < GROUP_MS;
            const p = profiles[m.user_id];
            const mine = m.user_id === me.id;
            const editing = editingId === m.id;
            return (
              <div key={m.id} className={cn("group relative flex gap-2.5 rounded-md", grouped ? "mt-0" : "mt-3 first:mt-0", editing && "bg-accent/50")}>
                <div className="w-8 shrink-0">
                  {!grouped && (
                    <Avatar>
                      <AvatarFallback style={{ background: p?.avatar_color ?? "#8d98b8" }}>{initials(p?.display_name ?? "?")}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {!grouped && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">{mine ? "You" : (p?.display_name ?? "Someone")}</span>
                      <time className="text-[11px] text-muted-foreground" dateTime={m.created_at} suppressHydrationWarning>
                        {formatTime(m.created_at)}
                      </time>
                    </div>
                  )}

                  {editing ? (
                    <div className="mt-0.5 pr-1 pb-1">
                      <textarea
                        autoFocus
                        value={editDraft}
                        maxLength={4000}
                        aria-label="Edit message"
                        onChange={(e) => setEditDraft(e.target.value)}
                        onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            void saveEdit();
                          } else if (e.key === "Escape") setEditingId(null);
                        }}
                        rows={Math.min(8, Math.max(2, editDraft.split("\n").length))}
                        className="w-full resize-none rounded-lg border bg-card px-2.5 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                      />
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Button size="sm" onClick={() => void saveEdit()} disabled={!editDraft.trim()}>
                          <Check /> Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X /> Cancel
                        </Button>
                        <span className="ml-auto text-[11px] text-muted-foreground">Enter to save · Esc to cancel</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={cn("text-sm leading-relaxed break-words whitespace-pre-wrap", m.pending && "opacity-60", m.failed && "text-destructive")}>
                        {m.body}
                        {m.edited_at && (
                          <span className="ml-1.5 text-[11px] text-muted-foreground" title={`Edited ${formatTime(m.edited_at)}`}>
                            (edited)
                          </span>
                        )}
                      </p>
                      {m.failed && (
                        <button onClick={() => retryMessage(m.id)} className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline">
                          <AlertCircle className="size-3" /> Not sent. Retry
                        </button>
                      )}
                      {m.pending && <Loader2 className="mt-0.5 size-3 animate-spin text-muted-foreground" aria-label="Sending" />}
                    </>
                  )}
                </div>

                {mine && !m.pending && !m.failed && !editing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Message actions"
                        className="absolute top-0 right-0 size-7 bg-card/80 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onSelect={() => startEdit(m.id, m.body)}>
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive onSelect={() => setDeleting(m.id)}>
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="px-3 pb-3">
        <div className="h-5 px-1 text-xs text-muted-foreground" aria-live="polite">
          {typingLabel}
        </div>
        <div className="flex items-end gap-2 rounded-xl border bg-card p-2 shadow-xs focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
          <textarea
            ref={inputRef}
            value={draft}
            rows={1}
            aria-label={`Message ${room.name}`}
            placeholder={`Message ${room.name}`}
            maxLength={4000}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
              if (e.target.value) notifyTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            className="max-h-36 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <Button size="icon-sm" onClick={submit} disabled={!draft.trim()} aria-label="Send message">
            <ArrowUp />
          </Button>
        </div>
      </div>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this message?</DialogTitle>
            <DialogDescription>It will be removed for everyone in {room.name}. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          {deletingMessage && <p className="line-clamp-4 rounded-lg border bg-muted/50 px-3 py-2 text-sm break-words whitespace-pre-wrap">{deletingMessage.body}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const id = deleting;
                setDeleting(null);
                if (id) void deleteMessage(id);
              }}
            >
              <Trash2 /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
