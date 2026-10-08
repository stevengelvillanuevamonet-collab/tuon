import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { JoinRoomButton } from "@/components/app/join-room-button";
import { Badge } from "@/components/ui/badge";
import { RoomProvider } from "@/components/room/room-provider";
import { Workspace } from "@/components/room/workspace";
import { requireSession } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Member, Message, Note, Role, Room, RoomFile } from "@/lib/types";

export const metadata: Metadata = { title: "Room" };

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(roomId)) notFound();

  const { user, profile } = await requireSession();
  const supabase = await createClient();

  const { data: room } = await supabase.from("rooms").select("*, courses(*)").eq("id", roomId).maybeSingle();
  if (!room) notFound();

  const { data: membership } = await supabase.from("room_members").select("role").eq("room_id", roomId).eq("user_id", user.id).maybeSingle();

  // Public room, not a member yet: preview and offer to join.
  if (!membership) {
    const r = room as Room;
    if (r.is_private) notFound();
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8">
          {r.courses && <Badge variant="course">{r.courses.code}</Badge>}
          <h1 className="mt-4 text-3xl font-bold">{r.name}</h1>
          {r.courses && <p className="mt-1 text-muted-foreground">{r.courses.name}</p>}
          {r.description && <p className="mt-4 text-sm">{r.description}</p>}
          <div className="mt-6 flex items-center gap-3">
            <JoinRoomButton roomId={r.id} size="lg" />
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3" /> {r.default_role === "member" ? "You'll join as view only: read notes and files, and chat" : "Members can read and write notes"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const [{ data: members }, { data: messages }, { data: notes }, { data: files }] = await Promise.all([
    supabase.from("room_members").select("user_id, role, profiles(*)").eq("room_id", roomId),
    supabase.from("messages").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(100),
    supabase.from("notes").select("*").eq("room_id", roomId).order("created_at", { ascending: true }),
    supabase.from("room_files").select("*").eq("room_id", roomId).order("created_at", { ascending: false }),
  ]);

  return (
    <RoomProvider
      // Remount on room change so the realtime channel is rebuilt cleanly.
      key={roomId}
      room={room as Room}
      me={profile}
      role={membership.role as Role}
      initialMembers={(members ?? []) as unknown as Member[]}
      initialMessages={((messages ?? []) as Message[]).reverse()}
      initialNotes={(notes ?? []) as Note[]}
      initialFiles={(files ?? []) as RoomFile[]}
    >
      <Workspace />
    </RoomProvider>
  );
}
