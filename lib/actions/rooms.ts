"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const roomSchema = z.object({
  name: z.string().trim().min(1, "Give the room a name.").max(80),
  // Optional topic label, e.g. "MATH 2210", "IELTS", "Guitar". Leave both blank for a personal room.
  topicLabel: z.string().trim().max(20).default(""),
  topicName: z.string().trim().max(100).default(""),
  description: z.string().trim().max(280).optional(),
  isPrivate: z.boolean(),
});

export async function createRoom(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = roomSchema.safeParse({
    name: formData.get("name"),
    topicLabel: formData.get("topicLabel") ?? "",
    topicName: formData.get("topicName") ?? "",
    description: formData.get("description") || undefined,
    isPrivate: formData.get("isPrivate") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to create a room." };

  // The topic is optional. With no label and no name, the room is simply personal.
  let courseId: string | null = null;
  if (v.topicLabel || v.topicName) {
    const label = v.topicLabel || v.topicName.slice(0, 20);
    const code = /\d/.test(label) ? label.toUpperCase() : label; // "math 2210" -> "MATH 2210", "IELTS" stays
    const name = v.topicName || label;

    // Reuse the topic if someone already created it.
    await supabase
      .from("courses")
      .upsert({ code, name, university: "", created_by: user.id }, { onConflict: "university,code", ignoreDuplicates: true });
    const { data: topic } = await supabase.from("courses").select("id").eq("university", "").eq("code", code).single();
    if (!topic) return { error: "Couldn't save the topic. Try again." };
    courseId = topic.id;
  }

  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      course_id: courseId,
      name: v.name,
      description: v.description ?? null,
      is_private: v.isPrivate,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !room) return { error: error?.message ?? "Couldn't create the room." };

  revalidatePath("/rooms", "layout");
  redirect(`/rooms/${room.id}`);
}

export async function joinRoomByCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = z.string().trim().min(4, "Enter the invite code you were sent.").safeParse(formData.get("code"));
  if (!code.success) return { error: code.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_room_by_code", { p_code: code.data });
  if (error || !data) return { error: error?.message ?? "That invite code doesn't match a room." };

  revalidatePath("/rooms", "layout");
  redirect(`/rooms/${data}`);
}

export async function joinPublicRoom(roomId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_public_room", { p_room_id: roomId });
  if (error) return { error: error.message };
  revalidatePath("/rooms", "layout");
  redirect(`/rooms/${roomId}`);
}

export async function leaveRoom(roomId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/rooms", "layout");
  redirect("/rooms");
}

export async function deleteRoom(roomId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  if (error) return { error: error.message };
  revalidatePath("/rooms", "layout");
  redirect("/rooms");
}
