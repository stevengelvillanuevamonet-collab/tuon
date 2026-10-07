"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUp, Loader2, MessageSquare } from "lucide-react";
import { cn, formatTime, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRoom } from "./room-provider";

const GROUP_MS = 5 * 60 * 1000;

export function ChatPanel() {
  const { messages, profiles, me, sendMessage, retryMessage, notifyTyping, typingNames, room } = useRoom();
  const [draft, setDraft] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);

  // Keep the view pinned to the newest message unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, typingNames.length]);

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

  const typingLabel =
    typingNames.length === 0 ? "" : typingNames.length === 1 ? `${typingNames[0]} is typing` : typingNames.length === 2 ? `${typingNames.join(" and ")} are typing` : "Several people are typing";

  return (
    <section aria-label="Chat" className="flex h-full min-h-0 flex-col bg-muted/30">
      <ScrollArea className="min-h-0 flex-1" viewportRef={viewportRef}>
        <div className="flex min-h-full flex-col justify-end gap-0.5 px-4 py-4">
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
            return (
              <div key={m.id} className={cn("group flex gap-2.5", grouped ? "mt-0" : "mt-3 first:mt-0")}>
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
                  <p className={cn("text-sm leading-relaxed break-words whitespace-pre-wrap", m.pending && "opacity-60", m.failed && "text-destructive")}>
                    {m.body}
                  </p>
                  {m.failed && (
                    <button onClick={() => retryMessage(m.id)} className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline">
                      <AlertCircle className="size-3" /> Not sent. Retry
                    </button>
                  )}
                  {m.pending && <Loader2 className="mt-0.5 size-3 animate-spin text-muted-foreground" aria-label="Sending" />}
                </div>
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
    </section>
  );
}
