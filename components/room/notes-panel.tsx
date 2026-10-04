"use client";

import { useState, useTransition } from "react";
import { ChevronDown, FileText, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createNote } from "@/lib/actions/notes";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NoteEditor } from "./note-editor";
import { useRoom } from "./room-provider";

export function NotesPanel() {
  const { notes, room, canEdit, addNote, online } = useRoom();
  const wide = useMediaQuery("(min-width: 1280px)");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, startCreate] = useTransition();

  const active = notes.find((n) => n.id === activeId) ?? notes[0] ?? null;

  function create() {
    startCreate(async () => {
      const res = await createNote(room.id);
      if (res.error || !res.note) return void toast.error(res.error ?? "Couldn't add a note.");
      addNote(res.note);
      setActiveId(res.note.id);
    });
  }

  const newButton = canEdit && (
    <Button size="sm" variant="secondary" onClick={create} disabled={creating}>
      {creating ? <Loader2 className="animate-spin" /> : <Plus />}
      New note
    </Button>
  );

  if (notes.length === 0) {
    return (
      <section aria-label="Notes" className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <FileText className="size-9 text-muted-foreground/60" />
        <div>
          <p className="font-medium">No notes in this room yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {canEdit ? "Start the first note. Everyone in the room sees it update live." : "Notes added by editors will show up here."}
          </p>
        </div>
        {newButton}
      </section>
    );
  }

  const list = (
    <ScrollArea className="h-full">
      <ul className="space-y-0.5 p-2">
        {notes.map((n) => {
          const editors = online.filter((p) => p.editing === n.id && p.user_id);
          return (
            <li key={n.id}>
              <button
                onClick={() => setActiveId(n.id)}
                aria-current={active?.id === n.id}
                className={cn("flex w-full flex-col rounded-md px-2.5 py-2 text-left hover:bg-accent", active?.id === n.id && "bg-accent")}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{n.title || "Untitled note"}</span>
                  {editors.length > 0 && <span className="size-1.5 shrink-0 rounded-full bg-online" aria-label="Someone is editing" />}
                </span>
                <span className="text-xs text-muted-foreground">{timeAgo(n.updated_at)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );

  const editor = active && <NoteEditor key={active.id} note={active} onDeleted={() => setActiveId(null)} />;

  if (wide) {
    return (
      <section aria-label="Notes" className="h-full">
        <ResizablePanelGroup direction="horizontal" autoSaveId="tuon-notes-split">
          <ResizablePanel defaultSize={26} minSize={16} maxSize={40} className="flex flex-col bg-card/40">
            <div className="flex items-center justify-between px-3 pt-3 pb-1">
              <span className="text-sm font-semibold">Notes</span>
              {newButton}
            </div>
            <div className="min-h-0 flex-1">{list}</div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={74} minSize={50}>
            {editor}
          </ResizablePanel>
        </ResizablePanelGroup>
      </section>
    );
  }

  return (
    <section aria-label="Notes" className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="min-w-0 max-w-[60%] justify-between">
              <span className="truncate">{active?.title || "Untitled note"}</span>
              <ChevronDown className="opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {notes.map((n) => (
              <DropdownMenuItem key={n.id} onSelect={() => setActiveId(n.id)}>
                <FileText /> <span className="truncate">{n.title || "Untitled note"}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto">{newButton}</div>
      </div>
      <div className="min-h-0 flex-1">{editor}</div>
    </section>
  );
}
