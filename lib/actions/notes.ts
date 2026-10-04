"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Note, NoteVersion } from "@/lib/types";

export async function createNote(roomId: string): Promise<{ note?: Note; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again to add a note." };

  const { data, error } = await supabase
    .from("notes")
    .insert({ room_id: roomId, title: "Untitled note", content_md: "", created_by: user.id, updated_by: user.id })
    .select("*")
    .single();
  if (error || !data) return { error: "You don't have permission to add notes in this room." };
  return { note: data as Note };
}

const saveSchema = z.object({
  noteId: z.string().uuid(),
  title: z.string().max(120),
  content: z.string().max(200000),
  baseVersion: z.number().int().positive(),
  force: z.boolean().optional(),
});

export type SaveResult =
  | { ok: true; version: number; updatedAt: string }
  | { ok: false; conflict: true; latest: Note }
  | { ok: false; conflict?: false; error: string };

/**
 * Optimistic concurrency: the update only applies if the note is still at the
 * version the editor loaded. Otherwise the caller gets the latest copy back.
 */
export async function saveNote(input: z.infer<typeof saveSchema>): Promise<SaveResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That note is too large to save." };
  const { noteId, title, content, baseVersion, force } = parsed.data;

  const supabase = await createClient();
  let query = supabase
    .from("notes")
    .update({ title: title.trim() || "Untitled note", content_md: content })
    .eq("id", noteId);
  if (!force) query = query.eq("version", baseVersion);

  const { data, error } = await query.select("version, updated_at").maybeSingle();
  if (error) return { ok: false, error: "Couldn't save. Check your connection." };
  if (data) return { ok: true, version: data.version, updatedAt: data.updated_at };

  const { data: latest } = await supabase.from("notes").select("*").eq("id", noteId).maybeSingle();
  if (latest) return { ok: false, conflict: true, latest: latest as Note };
  return { ok: false, error: "This note was deleted or you no longer have access." };
}

export async function deleteNote(noteId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  return error ? { error: "You don't have permission to delete this note." } : {};
}

export async function listVersions(noteId: string): Promise<NoteVersion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("note_versions")
    .select("id, version, title, content_md, created_at, profiles(display_name)")
    .eq("note_id", noteId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []) as unknown as NoteVersion[];
}
