"use server";

import * as Y from "yjs";
import { z } from "zod";
import { fromB64, toB64 } from "@/lib/collab/encoding";
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
    .insert({ room_id: roomId, title: "Untitled note", content: "", created_by: user.id, updated_by: user.id })
    .select("*")
    .single();
  if (error || !data) return { error: "You don't have permission to add notes in this room." };
  return { note: data as Note };
}

const saveSchema = z.object({
  noteId: z.string().uuid(),
  /** Only sent when the title was edited, so saving text never overwrites someone else's new title. */
  title: z.string().max(120).optional(),
  /** The document as HTML, kept for exports, version history and previews. */
  content: z.string().max(1000000),
  /** This browser's whole Yjs document, base64. The server merges it into what's stored. */
  update: z.string().max(8000000),
});

export type SaveResult = { ok: true; version: number; updatedAt: string } | { ok: false; error: string };

function mergeStates(stored: string | null | undefined, incoming: string): string {
  const doc = new Y.Doc();
  if (stored) Y.applyUpdate(doc, fromB64(stored));
  Y.applyUpdate(doc, fromB64(incoming));
  const merged = toB64(Y.encodeStateAsUpdate(doc));
  doc.destroy();
  return merged;
}

/**
 * Saves a live document. Edits from different people are *merged*, never rejected: the stored Yjs state and this
 * browser's state are combined, so two people saving at once both keep their changes. A revision number guards the
 * read-merge-write, and the loop simply tries again if someone else saved in between.
 */
export async function saveNoteState(input: z.infer<typeof saveSchema>): Promise<SaveResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That note is too large to save." };
  const { noteId, title, content, update } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again to save." };

  let saved = false;
  for (let attempt = 0; attempt < 6 && !saved; attempt++) {
    const { data: row, error: readError } = await supabase.from("note_states").select("ydoc, rev").eq("note_id", noteId).maybeSingle();
    if (readError) return { ok: false, error: "Couldn't save. Check your connection." };

    let merged: string;
    try {
      merged = mergeStates(row?.ydoc, update);
    } catch {
      return { ok: false, error: "This document couldn't be saved because its data was damaged." };
    }

    if (row) {
      const { data, error } = await supabase
        .from("note_states")
        .update({ ydoc: merged, rev: row.rev + 1, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq("note_id", noteId)
        .eq("rev", row.rev)
        .select("rev")
        .maybeSingle();
      if (error) return { ok: false, error: "You don't have permission to edit this note." };
      saved = Boolean(data); // no row back means someone saved first, so go round again
    } else {
      const { error } = await supabase.from("note_states").insert({ note_id: noteId, ydoc: merged, updated_by: user.id });
      if (!error) saved = true;
      else if (error.code !== "23505") return { ok: false, error: "You don't have permission to edit this note." };
    }
  }
  if (!saved) return { ok: false, error: "Lots of people are saving at once. Your changes are still on screen and will save again in a moment." };

  const patch: { content: string; title?: string } = { content };
  if (title !== undefined) patch.title = title.trim() || "Untitled note";
  const { data, error } = await supabase.from("notes").update(patch).eq("id", noteId).select("version, updated_at").maybeSingle();
  if (error || !data) return { ok: false, error: "This note was deleted or you no longer have access." };
  return { ok: true, version: data.version, updatedAt: data.updated_at };
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
    .select("id, version, title, content, created_at, profiles(display_name)")
    .eq("note_id", noteId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []) as unknown as NoteVersion[];
}
