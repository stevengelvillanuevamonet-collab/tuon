"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRoom } from "./room-provider";

export function PresenceAvatars() {
  const { online, members, notes, me, room } = useRoom();
  const onlineIds = new Set(online.map((p) => p.user_id));
  const shown = online.slice(0, 4);
  const extra = online.length - shown.length;
  const offline = members.filter((m) => !onlineIds.has(m.user_id));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${online.length} online. View members`}
      >
        <span className="flex -space-x-2">
          {shown.map((p) => (
            <span key={p.user_id} className="relative">
              <Avatar className="size-7 ring-2 ring-background">
                <AvatarFallback style={{ background: p.color }}>{initials(p.name)}</AvatarFallback>
              </Avatar>
              <span className="absolute right-0 bottom-0 size-2 rounded-full bg-online ring-2 ring-background" />
            </span>
          ))}
          {extra > 0 && (
            <span className="relative flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold ring-2 ring-background">+{extra}</span>
          )}
        </span>
        <span className="hidden text-xs text-muted-foreground sm:inline">{online.length} online</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Online now</DropdownMenuLabel>
        {online.length === 0 && <p className="px-2.5 pb-2 text-sm text-muted-foreground">Connecting…</p>}
        {online.map((p) => {
          const note = p.editing ? notes.find((n) => n.id === p.editing) : null;
          return (
            <div key={p.user_id} className="flex items-center gap-2.5 px-2.5 py-1.5">
              <Avatar className="size-7">
                <AvatarFallback style={{ background: p.color }}>{initials(p.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-sm">
                <div className="truncate font-medium">
                  {p.name}
                  {p.user_id === me.id && " (you)"}
                </div>
                {note && <div className="truncate text-xs text-muted-foreground">Editing {note.title}</div>}
              </div>
            </div>
          );
        })}
        {offline.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Offline</DropdownMenuLabel>
            {offline.map((m) => (
              <div key={m.user_id} className="flex items-center gap-2.5 px-2.5 py-1.5 opacity-70">
                <Avatar className="size-7">
                  <AvatarFallback style={{ background: m.profiles.avatar_color }}>{initials(m.profiles.display_name)}</AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">{m.profiles.display_name}</span>
              </div>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <div className="px-2.5 pt-1 pb-1.5">
          <div className="text-xs font-medium text-muted-foreground">Invite code</div>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(room.invite_code);
              toast.success("Invite code copied");
            }}
            className="mt-1 flex w-full items-center justify-between rounded-md border bg-card px-2.5 py-1.5 outline-none hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="font-mono text-sm font-semibold tracking-wide select-all">{room.invite_code}</span>
            <Copy className="size-4 text-muted-foreground" />
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
