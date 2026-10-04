import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role, Room } from "@/lib/types";

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  // Accounts created before the migration have no profile row yet.
  if (!profile) {
    const name = (user.user_metadata?.display_name as string | undefined) ?? user.email?.split("@")[0] ?? "Student";
    const { data } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: name.slice(0, 40) })
      .select("*")
      .single();
    profile = data;
  }

  return profile ? { user, profile: profile as Profile } : null;
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export interface MyRoom {
  role: Role;
  rooms: Room;
}

export const getMyRooms = cache(async (userId: string): Promise<MyRoom[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("room_members")
    .select("role, rooms(*, courses(*))")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
  return (data ?? []) as unknown as MyRoom[];
});
