"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bold, CheckCheck, Code, Copy, Heading2, Highlighter, Italic, Link2, List, ListChecks, Lock, MoreHorizontal, Quote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteNote, saveNote } from "@/lib/actions/notes";
import type { Note, NoteVersion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Markdown } from "./markdown";
import { useRoom } from "./room-provider";
import { VersionHistory } from "./version-history";

type Status = "saved" | "dirty" | "saving" | "error";
type Mode = "edit" | "split" | "preview";

const STATUS_LABEL: Record<Status, string> = { saved: "Saved", dirty: "Unsaved changes", saving: "Saving", error: "Couldn't save" };

function ToolButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={onClick} disabled={disabled} aria-label={label} className="size-7">
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Collaboration model:
 *  - Presence soft lock: the earliest person typing in a note holds it; others read along.
 *  - Autosave sends the version it started from. If someone else saved first, the server
 *    rejects it and the editor offers "use theirs" or "keep mine".
 */
export function NoteEditor({ note, onDeleted }: { note: Note; onDeleted: () => void }) {
  const { me, canEdit, online, setEditing, profiles, removeNote } = useRoom();

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content_md);
  const [status, setStatus] = useState<Status>("saved");
  const [conflict, setConflict] = useState<Note | null>(null);
  const [mode, setMode] = useState<Mode>("edit");

  const baseVersion = useRef(note.version);
  const dirty = useRef(false);
  const saving = useRef(false);
  const conflictRef = useRef<Note | null>(null);
  const latest = useRef({ title: note.title, content: note.content_md });
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lockedBy = useMemo(() => {
    const editors = online.filter((p) => p.editing === note.id).sort((a, b) => (a.editing_since ?? 0) - (b.editing_since ?? 0));
    const holder = editors[0];
    return holder && holder.user_id !== me.id ? holder : null;
  }, [online, note.id, me.id]);

  const readOnly = !canEdit || Boolean(lockedBy);

  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveRef.current(), 1000);
  }, []);

  const save = useCallback(
    async (force = false) => {
      clearTimeout(saveTimer.current);
      if (conflictRef.current && !force) return;
      if (saving.current) {
        scheduleSave();
        return;
      }
      saving.current = true;
      const snapshot = { ...latest.current };
      setStatus("saving");
      const res = await saveNote({ noteId: note.id, title: snapshot.title, content: snapshot.content, baseVersion: baseVersion.current, force });
      saving.current = false;

      if (res.ok) {
        baseVersion.current = Math.max(baseVersion.current, res.version);
        conflictRef.current = null;
        setConflict(null);
        if (latest.current.title === snapshot.title && latest.current.content === snapshot.content) {
          dirty.current = false;
          setStatus("saved");
        } else {
          setStatus("dirty");
          scheduleSave();
        }
      } else if (res.conflict) {
        conflictRef.current = res.latest;
        setConflict(res.latest);
        setStatus("error");
      } else {
        setStatus("error");
        toast.error(res.error);
      }
    },
    [note.id, scheduleSave],
  );
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const scheduleIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (dirty.current) scheduleIdle();
      else setEditing(null);
    }, 6000);
  }, [setEditing]);

  const touch = useCallback(() => {
    dirty.current = true;
    setStatus("dirty");
    setEditing(note.id);
    scheduleSave();
    scheduleIdle();
  }, [note.id, setEditing, scheduleSave, scheduleIdle]);

  // Remote changes arriving over Realtime.
  useEffect(() => {
    if (note.version <= baseVersion.current) return;
    if (!dirty.current) {
      setTitle(note.title);
      setContent(note.content_md);
      latest.current = { title: note.title, content: note.content_md };
      baseVersion.current = note.version;
    } else if (note.updated_by === me.id) {
      baseVersion.current = note.version; // echo of my own save
    } else {
      conflictRef.current = note;
      setConflict(note);
    }
  }, [note, me.id]);

  // Release the lock and flush on leave.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      clearTimeout(idleTimer.current);
      clearTimeout(saveTimer.current);
      if (dirty.current && !conflictRef.current) void saveRef.current();
      setEditing(null);
    };
  }, [setEditing]);

  function onContent(v: string) {
    setContent(v);
    latest.current = { ...latest.current, content: v };
    touch();
  }

  function onTitle(v: string) {
    setTitle(v);
    latest.current = { ...latest.current, title: v };
    touch();
  }

  // ── toolbar helpers ──
  function edit(fn: (value: string, s: number, e: number) => { value: string; start: number; end: number }) {
    const ta = textareaRef.current;
    if (!ta || readOnly) return;
    const next = fn(ta.value, ta.selectionStart, ta.selectionEnd);
    onContent(next.value);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(next.start, next.end);
    });
  }
  const inline = (before: string, after: string, placeholder: string) =>
    edit((v, s, e) => {
      const text = v.slice(s, e) || placeholder;
      return { value: v.slice(0, s) + before + text + after + v.slice(e), start: s + before.length, end: s + before.length + text.length };
    });
  const linePrefix = (prefix: string) =>
    edit((v, s, e) => {
      const ls = v.lastIndexOf("\n", s - 1) + 1;
      return { value: v.slice(0, ls) + prefix + v.slice(ls), start: s + prefix.length, end: e + prefix.length };
    });

  function restore(v: NoteVersion) {
    setTitle(v.title);
    setContent(v.content_md);
    latest.current = { title: v.title, content: v.content_md };
    dirty.current = true;
    setStatus("dirty");
    void saveRef.current(true);
  }

  function useTheirs() {
    if (!conflict) return;
    setTitle(conflict.title);
    setContent(conflict.content_md);
    latest.current = { title: conflict.title, content: conflict.content_md };
    baseVersion.current = conflict.version;
    dirty.current = false;
    conflictRef.current = null;
    setConflict(null);
    setStatus("saved");
  }

  function keepMine() {
    if (!conflict) return;
    baseVersion.current = conflict.version;
    void save(true);
  }

  async function remove() {
    if (!window.confirm(`Delete “${title}”? This removes its version history too.`)) return;
    const res = await deleteNote(note.id);
    if (res.error) return toast.error(res.error);
    removeNote(note.id);
    onDeleted();
  }

  const conflictAuthor = conflict?.updated_by ? profiles[conflict.updated_by]?.display_name : null;

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          void save();
        }
      }}
    >
      {/* title row */}
      <div className="flex items-center gap-2 px-5 pt-4">
        <input
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          readOnly={readOnly}
          maxLength={120}
          aria-label="Note title"
          placeholder="Untitled note"
          className="min-w-0 flex-1 bg-transparent font-display text-2xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/50"
        />
        <span
          className={cn("hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex", status === "error" && "text-destructive")}
          role="status"
          aria-live="polite"
        >
          {status === "saved" && <CheckCheck className="size-3.5 text-online" />}
          {STATUS_LABEL[status]}
        </span>
        <VersionHistory noteId={note.id} canRestore={canEdit && !lockedBy} onRestore={restore} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Note actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                void navigator.clipboard.writeText(content);
                toast.success("Markdown copied");
              }}
            >
              <Copy /> Copy markdown
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem destructive onSelect={() => void remove()}>
                <Trash2 /> Delete note
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* banners */}
      {lockedBy && (
        <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg border bg-mark-yellow/30 px-3 py-2 text-sm" role="status">
          <Lock className="size-4 shrink-0" />
          <span>
            <strong className="font-semibold">{lockedBy.name}</strong> is editing this note. It unlocks a few seconds after they stop typing.
          </span>
        </div>
      )}
      {!canEdit && (
        <div className="mx-5 mt-3 rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground">You have view-only access to notes in this room.</div>
      )}
      {conflict && (
        <div className="mx-5 mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm" role="alert">
          <p className="font-medium">{conflictAuthor ?? "Someone"} saved a newer version while you were typing.</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={useTheirs}>
              Use their version
            </Button>
            <Button size="sm" onClick={keepMine}>
              Keep mine
            </Button>
          </div>
        </div>
      )}

      {/* toolbar */}
      <div className="mt-3 flex items-center gap-2 border-y px-4 py-1.5">
        <div className={cn("thin-scroll flex min-w-0 items-center gap-0.5 overflow-x-auto", mode === "preview" && "pointer-events-none opacity-40")}>
          <ToolButton label="Heading" disabled={readOnly} onClick={() => linePrefix("## ")}>
            <Heading2 className="size-4" />
          </ToolButton>
          <ToolButton label="Bold" disabled={readOnly} onClick={() => inline("**", "**", "bold text")}>
            <Bold className="size-4" />
          </ToolButton>
          <ToolButton label="Italic" disabled={readOnly} onClick={() => inline("*", "*", "italic text")}>
            <Italic className="size-4" />
          </ToolButton>
          <ToolButton label="Highlight" disabled={readOnly} onClick={() => inline("==", "==", "key idea")}>
            <Highlighter className="size-4" />
          </ToolButton>
          <ToolButton label="Bulleted list" disabled={readOnly} onClick={() => linePrefix("- ")}>
            <List className="size-4" />
          </ToolButton>
          <ToolButton label="Checklist" disabled={readOnly} onClick={() => linePrefix("- [ ] ")}>
            <ListChecks className="size-4" />
          </ToolButton>
          <ToolButton label="Quote" disabled={readOnly} onClick={() => linePrefix("> ")}>
            <Quote className="size-4" />
          </ToolButton>
          <ToolButton label="Code" disabled={readOnly} onClick={() => inline("`", "`", "code")}>
            <Code className="size-4" />
          </ToolButton>
          <ToolButton label="Link" disabled={readOnly} onClick={() => inline("[", "](https://)", "link text")}>
            <Link2 className="size-4" />
          </ToolButton>
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="ml-auto shrink-0">
          <TabsList className="h-8">
            <TabsTrigger value="edit" className="px-2.5 text-xs">Write</TabsTrigger>
            <TabsTrigger value="split" className="hidden px-2.5 text-xs 2xl:inline-flex">Split</TabsTrigger>
            <TabsTrigger value="preview" className="px-2.5 text-xs">Preview</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* body */}
      <div className={cn("grid min-h-0 flex-1", mode === "split" && "grid-cols-2 divide-x")}>
        {mode !== "preview" && (
          <textarea
            ref={textareaRef}
            value={content}
            readOnly={readOnly}
            onChange={(e) => onContent(e.target.value)}
            spellCheck
            aria-label="Note content in markdown"
            placeholder={"Start writing. Markdown works here, and ==double equals== highlights."}
            className="thin-scroll size-full resize-none bg-transparent px-5 py-4 font-mono text-[13.5px] leading-7 outline-none placeholder:text-muted-foreground/60 read-only:cursor-default"
          />
        )}
        {mode !== "edit" && (
          <div className="thin-scroll min-h-0 overflow-y-auto px-6 py-4">
            {content.trim() ? <Markdown>{content}</Markdown> : <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
