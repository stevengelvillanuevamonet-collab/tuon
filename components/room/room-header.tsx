"use client";

import { useState } from "react";
import { Check, Link2, LogOut, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteRoom, leaveRoom } from "@/lib/actions/rooms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PresenceAvatars } from "./presence-avatars";
import { useRoom } from "./room-provider";

export function RoomHeader() {
  const { room, role, connection } = useRoom();
  const [copied, setCopied] = useState(false);

  async function copyInvite() {
    await navigator.clipboard.writeText(`${window.location.origin}/join/${room.invite_code}`);
    setCopied(true);
    toast.success("Invite link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-card/60 px-4">
      {room.courses && <Badge variant="course">{room.courses.code}</Badge>}
      <h1 className="min-w-0 truncate font-display text-base font-semibold tracking-tight">{room.name}</h1>
      {connection !== "live" && (
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex" role="status">
          <span className="size-1.5 rounded-full bg-mark-pink" />
          {connection === "connecting" ? "Connecting" : "Reconnecting"}
        </span>
      )}
      <div className="ml-auto flex items-center gap-1.5">
        <PresenceAvatars />
        <Button variant="outline" size="sm" onClick={copyInvite}>
          {copied ? <Check /> : <Link2 />}
          <span className="hidden sm:inline">Invite</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Room actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                void navigator.clipboard.writeText(room.invite_code);
                toast.success("Invite code copied");
              }}
            >
              <Link2 /> Copy invite code
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {role === "owner" ? (
              <DropdownMenuItem
                destructive
                onSelect={async () => {
                  if (!window.confirm(`Delete “${room.name}” and everything in it?`)) return;
                  const res = await deleteRoom(room.id);
                  if (res?.error) toast.error(res.error);
                }}
              >
                <Trash2 /> Delete room
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                destructive
                onSelect={async () => {
                  const res = await leaveRoom(room.id);
                  if (res?.error) toast.error(res.error);
                }}
              >
                <LogOut /> Leave room
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
