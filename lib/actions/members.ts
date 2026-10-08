"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

const idSchema = z.string().uuid();
const roleSchema = z.enum(["editor", "member"]);

/** Signed-in user, plus whether they own this room. The database enforces this too; this gives clear error messages. */
async function ownerContext(roomId: string) {
  const parsed = idSchema.safeParse(roomId);
  if (!parsed.success) return { error: "That room doesn't exist." } as const;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again to manage members." } as const;
  const { data } = await supabase.from("room_members").select("role").eq("room_id", roomId).eq("user_id", user.id).maybeSingle();
  if (data?.role !== "owner") return { error: "Only the room owner can do that." } as const;
  return { supabase, user } as const;
}

/** Change what one member can do: "editor" (can edit) or "member" (can view). */
export async function setMemberRole(roomId: string, userId: string, role: "editor" | "member"): Promise<Result> {
  if (!idSchema.safeParse(userId).success || !roleSchema.safeParse(role).success) return { error: "That request wasn't valid." };
  const ctx = await ownerContext(roomId);
  if ("error" in ctx) return { error: ctx.error };
  if (userId === ctx.user.id) return { error: "You're the owner. Your access can't be changed." };

  const { data, error } = await ctx.supabase.from("room_members").update({ role }).eq("room_id", roomId).eq("user_id", userId).neq("role", "owner").select("user_id");
  if (error) return { error: "Couldn't change that role. Try again." };
  if (!data?.length) return { error: "That person is no longer in the room." };
  return {};
}

/** Take someone out of the room. They keep nothing: no notes, files or chat. */
export async function removeMember(roomId: string, userId: string): Promise<Result> {
  if (!idSchema.safeParse(userId).success) return { error: "That request wasn't valid." };
  const ctx = await ownerContext(roomId);
  if ("error" in ctx) return { error: ctx.error };
  if (userId === ctx.user.id) return { error: "You're the owner. Delete the room instead of removing yourself." };

  const { data, error } = await ctx.supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", userId).neq("role", "owner").select("user_id");
  if (error) return { error: "Couldn't remove that person. Try again." };
  if (!data?.length) return { error: "That person is no longer in the room." };
  return {};
}

/** What people get when they join from now on. Doesn't change anyone already in the room. */
export async function setDefaultRole(roomId: string, role: "editor" | "member"): Promise<Result> {
  if (!roleSchema.safeParse(role).success) return { error: "That request wasn't valid." };
  const ctx = await ownerContext(roomId);
  if ("error" in ctx) return { error: ctx.error };
  const { data, error } = await ctx.supabase.from("rooms").update({ default_role: role }).eq("id", roomId).select("id");
  if (error || !data?.length) return { error: "Couldn't update the setting. Try again." };
  return {};
}
