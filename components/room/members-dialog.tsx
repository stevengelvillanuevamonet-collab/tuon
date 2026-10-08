"use client";

import { useState } from "react";
import { Check, ChevronDown, Eye, Pencil, UserMinus, Users } from "lucide-react";
import type { Member, Role } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRoom } from "./room-provider";

type Assignable = "editor" | "member";

/** Words people see. In the database these are the roles "editor" and "member". */
const ROLE: Record<Role, { label: string; short: string; help: string }> = {
  owner: { label: "Owner", short: "Owner", help: "Manages the room and its members" },
  editor: { label: "Can edit", short: "Can edit", help: "Write notes, upload files, chat" },
  member: { label: "Can view", short: "View only", help: "Read notes and files, watch edits live, chat" },
};
const ORDER: Record<Role, number> = { owner: 0, editor: 1, member: 2 };

function RoleChoice({ value, active, onPick, disabled }: { value: Assignable; active: boolean; onPick: () => void; disabled?: boolean }) {
  const Icon = value === "editor" ? Pencil : Eye;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onPick}
      className={cn(
        "flex flex-1 items-start gap-2.5 rounded-lg border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        active ? "border-primary bg-primary/5" : "hover:bg-accent",
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{ROLE[value].label}</span>
        <span className="block text-xs text-muted-foreground">{ROLE[value].help}</span>
      </span>
    </button>
  );
}

function MemberRow({ member, isOwner, busyId, setBusyId }: { member: Member; isOwner: boolean; busyId: string | null; setBusyId: (id: string | null) => void }) {
  const { profiles, online, me, room, changeMemberRole, kickMember } = useRoom();
  const p = profiles[member.user_id] ?? member.profiles;
  const isMe = member.user_id === me.id;
  const isOnline = online.some((o) => o.user_id === member.user_id);
  const canManage = isOwner && member.role !== "owner" && !isMe;
  const busy = busyId === member.user_id;

  async function pick(role: Assignable) {
    if (role === member.role) return;
    setBusyId(member.user_id);
    await changeMemberRole(member.user_id, role);
    setBusyId(null);
  }

  async function remove() {
    if (!window.confirm(`Remove ${p.display_name} from “${room.name}”? They will lose access to its notes, files and chat.`)) return;
    setBusyId(member.user_id);
    await kickMember(member.user_id);
    setBusyId(null);
  }

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="relative">
        <Avatar className="size-9">
          <AvatarFallback style={{ background: p.avatar_color }}>{initials(p.display_name)}</AvatarFallback>
        </Avatar>
        {isOnline && <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-online ring-2 ring-card" aria-label="Online" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {p.display_name}
          {isMe && <span className="ml-1.5 font-normal text-muted-foreground">(you)</span>}
        </div>
        <div className="text-xs text-muted-foreground">{isOnline ? "Online now" : "Offline"}</div>
      </div>

      {canManage ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={busy} aria-label={`Change access for ${p.display_name}. Currently ${ROLE[member.role].label}`}>
              {ROLE[member.role].label}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {(["editor", "member"] as const).map((r) => (
              <DropdownMenuItem key={r} onSelect={() => void pick(r)} className="items-start">
                <Check className={cn("mt-0.5", member.role === r ? "opacity-100" : "opacity-0")} />
                <span>
                  <span className="block font-medium">{ROLE[r].label}</span>
                  <span className="block text-xs text-muted-foreground">{ROLE[r].help}</span>
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => void remove()}>
              <UserMinus /> Remove from room
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Badge variant={member.role === "owner" ? "course" : "outline"}>{ROLE[member.role].short}</Badge>
      )}
    </li>
  );
}

export function MembersDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { members, profiles, role, defaultRole, changeDefaultRole, room } = useRoom();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingDefault, setSavingDefault] = useState(false);
  const isOwner = role === "owner";

  const sorted = [...members].sort((a, b) => ORDER[a.role] - ORDER[b.role] || (profiles[a.user_id] ?? a.profiles).display_name.localeCompare((profiles[b.user_id] ?? b.profiles).display_name));

  async function setDefault(r: Assignable) {
    if (r === defaultRole) return;
    setSavingDefault(true);
    await changeDefaultRole(r);
    setSavingDefault(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Members of {room.name}</DialogTitle>
          <DialogDescription>
            {isOwner ? "Choose who can edit and who can only view. Changes apply straight away." : "Here's who is in this room and what they can do."}
          </DialogDescription>
        </DialogHeader>

        {isOwner && (
          <section aria-labelledby="default-role-label">
            <h3 id="default-role-label" className="text-sm font-medium">
              When someone joins with the invite link, they can
            </h3>
            <div role="radiogroup" aria-labelledby="default-role-label" className="mt-2 flex flex-col gap-2 sm:flex-row">
              <RoleChoice value="editor" active={defaultRole === "editor"} disabled={savingDefault} onPick={() => void setDefault("editor")} />
              <RoleChoice value="member" active={defaultRole === "member"} disabled={savingDefault} onPick={() => void setDefault("member")} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">This only affects new people. You can change anyone already here below.</p>
          </section>
        )}

        <section aria-label="People in this room">
          <h3 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
            <Users className="size-4 text-muted-foreground" /> {members.length} {members.length === 1 ? "person" : "people"}
          </h3>
          <ul className="max-h-72 divide-y overflow-y-auto pr-1">
            {sorted.map((m) => (
              <MemberRow key={m.user_id} member={m} isOwner={isOwner} busyId={busyId} setBusyId={setBusyId} />
            ))}
          </ul>
        </section>
      </DialogContent>
    </Dialog>
  );
}

export function MembersButton() {
  const { members } = useRoom();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label={`Members, ${members.length}`}>
        <Users />
        <span className="hidden sm:inline">Members</span>
        <span className="rounded-full bg-muted px-1.5 text-[11px] leading-[18px] font-semibold tabular-nums">{members.length}</span>
      </Button>
      <MembersDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
