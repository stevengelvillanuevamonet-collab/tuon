"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { useLocalFlag } from "@/lib/hooks/use-local-setting";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function UserMenu({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  const [paused, setPaused] = useLocalFlag("tuon-bg-paused", false);
  const [inRooms, setInRooms] = useLocalFlag("tuon-bg-in-rooms", false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={compact ? `Account: ${profile.display_name}` : undefined}
        className={cn("flex items-center gap-2.5 rounded-lg p-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring", compact ? "justify-center" : "w-full")}
      >
        <Avatar className="size-8">
          <AvatarFallback style={{ background: profile.avatar_color }}>{initials(profile.display_name)}</AvatarFallback>
        </Avatar>
        {!compact && <span className="min-w-0 flex-1 truncate text-sm font-medium">{profile.display_name}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel>Signed in as {profile.display_name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setPaused(!paused);
          }}
          className="justify-between"
        >
          Animated background
          <Switch checked={!paused} tabIndex={-1} aria-label="Animated background" className="pointer-events-none" />
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={paused}
          onSelect={(e) => {
            e.preventDefault();
            setInRooms(!inRooms);
          }}
          className="justify-between"
        >
          Keep it moving in rooms
          <Switch checked={inRooms && !paused} tabIndex={-1} aria-label="Keep the background moving in rooms" className="pointer-events-none" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
