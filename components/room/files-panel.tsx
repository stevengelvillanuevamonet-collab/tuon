"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileText, Loader2, Presentation, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ACCEPT, FILE_BUCKET, extOf, fileKind, formatBytes, mimeFor, validateFile } from "@/lib/files";
import type { RoomFile } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileViewer } from "./file-viewer";
import { useRoom } from "./room-provider";

function KindIcon({ name }: { name: string }) {
  const kind = fileKind(name);
  const pdf = kind === "pdf";
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", pdf ? "bg-[#FDECEE] text-[#D92D4A]" : "bg-[#FFF1E6] text-[#D9600A]")}>
      {pdf ? <FileText className="size-5" /> : <Presentation className="size-5" />}
    </span>
  );
}

export function FilesPanel() {
  const { files, room, me, role, canEdit, addFile, removeFile, profiles } = useRoom();
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ id: string; name: string }[]>([]);
  const [dragging, setDragging] = useState(false);

  const open = files.find((f) => f.id === openId) ?? null;

  async function uploadOne(file: File) {
    const problem = validateFile(file);
    if (problem) return void toast.error(`${file.name}: ${problem}`);

    const id = crypto.randomUUID();
    const path = `${room.id}/${id}.${extOf(file.name)}`;
    const mime = mimeFor(file.name);
    setUploading((u) => [...u, { id, name: file.name }]);
    try {
      const { error: upErr } = await supabase.storage.from(FILE_BUCKET).upload(path, file, { contentType: mime, upsert: false });
      if (upErr) throw new Error("upload");
      const { data, error } = await supabase
        .from("room_files")
        .insert({ id, room_id: room.id, name: file.name, storage_path: path, mime_type: mime, size_bytes: file.size, uploaded_by: me.id })
        .select("*")
        .single();
      if (error || !data) {
        await supabase.storage.from(FILE_BUCKET).remove([path]); // don't leave an orphan behind
        throw new Error("record");
      }
      addFile(data as RoomFile);
      toast.success(`Added ${file.name}`);
    } catch {
      toast.error(`Couldn't upload ${file.name}. Check your connection and that you can edit this room.`);
    } finally {
      setUploading((u) => u.filter((x) => x.id !== id));
    }
  }

  async function uploadMany(list: FileList | File[]) {
    if (!canEdit) return void toast.error("You have view-only access in this room.");
    await Promise.all(Array.from(list).map(uploadOne));
  }

  async function download(f: RoomFile) {
    const { data, error } = await supabase.storage.from(FILE_BUCKET).createSignedUrl(f.storage_path, 60, { download: f.name });
    if (error || !data) return void toast.error("Couldn't prepare the download.");
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function remove(f: RoomFile) {
    if (!window.confirm(`Delete “${f.name}” for everyone in this room?`)) return;
    const { error: sErr } = await supabase.storage.from(FILE_BUCKET).remove([f.storage_path]);
    if (sErr) return void toast.error("You don't have permission to delete this file.");
    const { error } = await supabase.from("room_files").delete().eq("id", f.id);
    if (error) return void toast.error("Couldn't delete this file.");
    removeFile(f.id);
    if (openId === f.id) setOpenId(null);
  }

  if (open) return <FileViewer key={open.id} file={open} onClose={() => setOpenId(null)} />;

  return (
    <section
      aria-label="Files"
      className="relative flex h-full min-h-0 flex-col"
      onDragOver={(e) => {
        if (canEdit && e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) void uploadMany(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Files</h2>
          <p className="text-xs text-muted-foreground">PDF and PowerPoint, up to 50 MB each</p>
        </div>
        {canEdit && (
          <>
            <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => (e.target.files && void uploadMany(e.target.files), (e.target.value = ""))} />
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              <Upload /> Upload
            </Button>
          </>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="space-y-2 p-4">
          {uploading.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-xl border border-dashed bg-card/60 p-3 text-sm">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="min-w-0 flex-1 truncate">Uploading {u.name}</span>
            </li>
          ))}
          {files.map((f) => {
            const who = profiles[f.uploaded_by]?.display_name ?? "Someone";
            const canDelete = f.uploaded_by === me.id || role === "owner";
            return (
              <li key={f.id} className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/50">
                <button onClick={() => setOpenId(f.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <KindIcon name={f.name} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{f.name}</span>
                    <span className="block text-xs text-muted-foreground" suppressHydrationWarning>
                      {who} · {formatBytes(f.size_bytes)} · {timeAgo(f.created_at)}
                    </span>
                  </span>
                </button>
                <Button variant="ghost" size="icon-sm" onClick={() => download(f)} aria-label={`Download ${f.name}`}>
                  <Download />
                </Button>
                {canDelete && (
                  <Button variant="ghost" size="icon-sm" onClick={() => remove(f)} aria-label={`Delete ${f.name}`} className="text-muted-foreground hover:text-destructive">
                    <Trash2 />
                  </Button>
                )}
              </li>
            );
          })}
          {files.length === 0 && uploading.length === 0 && (
            <li className="rounded-xl border border-dashed p-10 text-center">
              <Upload className="mx-auto size-8 text-muted-foreground/60" />
              <p className="mt-3 font-medium">No files yet</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                {canEdit ? "Drop a PDF or PowerPoint here, or use Upload. Everyone in the room can open it instantly." : "Files added by editors will show up here."}
              </p>
            </li>
          )}
        </ul>
      </ScrollArea>

      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/10 text-sm font-semibold text-primary backdrop-blur-[1px]">
          Drop to upload to {room.name}
        </div>
      )}
    </section>
  );
}
