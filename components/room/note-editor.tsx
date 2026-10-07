"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { CheckCheck, FileText, History, Lock, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { deleteNote, saveNote } from "@/lib/actions/notes";
import type { DocNode } from "@/lib/export-docx";
import type { Note, NoteVersion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DOC_CSS } from "./doc/doc-styles";
import { buildExtensions, toDocHtml } from "./doc/extensions";
import { DEFAULT_PREFS, MARGIN_PX, loadPrefs, pageDims, savePrefs, type DocPrefs } from "./doc/prefs";
import { printDocument } from "./doc/print";
import { Ribbon } from "./doc/ribbon";
import { useRoom } from "./room-provider";
import { VersionHistory } from "./version-history";

type Status = "saved" | "dirty" | "saving" | "error";
const STATUS_LABEL: Record<Status, string> = { saved: "Saved", dirty: "Unsaved changes", saving: "Saving…", error: "Couldn't save" };

/** HTML with trailing empty paragraphs removed, so the editor's own housekeeping never counts as an edit. */
const norm = (html: string) => html.replace(/(<p>\s*<\/p>)+$/, "");

const safeName = (s: string) => (s.trim() || "Untitled").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * A Word-style document editor with a ribbon, page canvas and status bar.
 *
 * Collaboration model (unchanged from the markdown version):
 *  - Presence soft lock: the earliest person typing holds the document; others read along.
 *  - Autosave sends the version it started from. If someone else saved first, the server rejects it and we offer "use theirs" or "keep mine".
 */
export function NoteEditor({ note, onDeleted }: { note: Note; onDeleted: () => void }) {
  const { me, canEdit, online, setEditing, profiles, removeNote } = useRoom();

  const [title, setTitle] = useState(note.title);
  const [status, setStatus] = useState<Status>("saved");
  const [conflict, setConflict] = useState<Note | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [prefs, setPrefsState] = useState<DocPrefs>(DEFAULT_PREFS);
  const [canvasW, setCanvasW] = useState(0);
  const [page, setPage] = useState({ current: 1, total: 1 });
  const [counts, setCounts] = useState({ words: 0, chars: 0 });

  const baseVersion = useRef(note.version);
  const dirty = useRef(false);
  const saving = useRef(false);
  const conflictRef = useRef<Note | null>(null);
  const latest = useRef({ title: note.title, content: note.content });
  const synced = useRef<string | null>(null); // normalised HTML the server (or the user's last save) already has
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  const touchRef = useRef<() => void>(() => {});
  const interacted = useRef(false); // true once the person has typed, pasted, dropped or used the ribbon
  const canvasRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  // view preferences live on this device (page size, margins, zoom)
  useEffect(() => setPrefsState(loadPrefs()), []);
  const setPrefs = (p: DocPrefs) => {
    setPrefsState(p);
    savePrefs(p);
  };

  const lockedBy = useMemo(() => {
    const editors = online.filter((p) => p.editing === note.id).sort((a, b) => (a.editing_since ?? 0) - (b.editing_since ?? 0));
    const holder = editors[0];
    return holder && holder.user_id !== me.id ? holder : null;
  }, [online, note.id, me.id]);
  const readOnly = !canEdit || Boolean(lockedBy);

  // ── editor ──
  const editor = useEditor(
    {
      extensions: buildExtensions(),
      content: toDocHtml(note.content),
      editable: !readOnly,
      immediatelyRender: false,
      editorProps: { attributes: { spellcheck: "true", "aria-label": "Document", "aria-multiline": "true" } },
      onCreate: ({ editor: e }) => {
        synced.current = norm(e.getHTML());
      },
      onUpdate: ({ editor: e }) => {
        const html = e.getHTML();
        latest.current = { ...latest.current, content: html };
        if (!interacted.current) return; // the editor tidying up after loading, not an edit
        if (!dirty.current && synced.current !== null && norm(html) === synced.current) return;
        touchRef.current();
        setCounts({ words: e.storage.characterCount.words(), chars: e.storage.characterCount.characters() });
      },
    },
    [],
  );

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    setCounts({ words: editor.storage.characterCount.words(), chars: editor.storage.characterCount.characters() });
  }, [editor]);

  // ── saving ──
  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveRef.current(), 1000);
  }, []);

  const save = useCallback(
    async (force = false) => {
      clearTimeout(saveTimer.current);
      if (conflictRef.current && !force) return;
      if (saving.current) return void scheduleSave();
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
          synced.current = norm(snapshot.content);
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
  useEffect(() => {
    touchRef.current = touch;
  }, [touch]);

  // changes arriving from other people over Realtime
  useEffect(() => {
    if (note.version <= baseVersion.current || !editor) return;
    if (!dirty.current) {
      const html = toDocHtml(note.content);
      if (editor.getHTML() !== html) editor.commands.setContent(html, { emitUpdate: false });
      synced.current = norm(editor.getHTML());
      setTitle(note.title);
      latest.current = { title: note.title, content: note.content };
      baseVersion.current = note.version;
    } else if (note.updated_by === me.id) {
      baseVersion.current = note.version; // echo of my own save
    } else {
      conflictRef.current = note;
      setConflict(note);
    }
  }, [note, me.id, editor]);

  // release the lock and flush on leave
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

  function onTitle(v: string) {
    setTitle(v);
    latest.current = { ...latest.current, title: v };
    touch();
  }

  function restore(v: NoteVersion) {
    if (!editor) return;
    setTitle(v.title);
    editor.commands.setContent(toDocHtml(v.content), { emitUpdate: false });
    latest.current = { title: v.title, content: editor.getHTML() };
    synced.current = null;
    dirty.current = true;
    setStatus("dirty");
    void saveRef.current(true);
  }

  function useTheirs() {
    if (!conflict || !editor) return;
    setTitle(conflict.title);
    editor.commands.setContent(toDocHtml(conflict.content), { emitUpdate: false });
    latest.current = { title: conflict.title, content: conflict.content };
    synced.current = norm(editor.getHTML());
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
    if (res.error) return void toast.error(res.error);
    removeNote(note.id);
    onDeleted();
  }

  // ── page canvas ──
  const dims = pageDims(prefs);
  const marginPx = MARGIN_PX[prefs.margin];
  const fit = canvasW ? Math.min(1, Math.max(0.3, (canvasW - 48) / dims.w)) : 1;
  const zoom = prefs.zoom === "fit" ? fit : prefs.zoom;

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => setCanvasW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [editor]);

  const measurePages = useCallback(() => {
    const canvas = canvasRef.current;
    const paper = paperRef.current;
    if (!canvas || !paper) return;
    const paperTop = paper.getBoundingClientRect().top - canvas.getBoundingClientRect().top;
    const pageH = dims.h * zoom;
    const total = Math.max(1, Math.ceil((paper.getBoundingClientRect().height - 1) / pageH));
    const mid = canvas.clientHeight / 2 - paperTop;
    setPage({ total, current: Math.min(total, Math.max(1, Math.floor(mid / pageH) + 1)) });
  }, [dims.h, zoom]);

  useEffect(() => {
    measurePages();
    const paper = paperRef.current;
    if (!paper) return;
    const ro = new ResizeObserver(measurePages);
    ro.observe(paper);
    return () => ro.disconnect();
  }, [measurePages, editor, prefs]);

  // ── file actions ──
  const exportOpts = { page: prefs.page, landscape: prefs.landscape, marginPx };
  const file = {
    downloadDocx: async () => {
      if (!editor) return;
      try {
        const [{ Packer }, { buildDocument }] = await Promise.all([import("docx"), import("@/lib/export-docx")]);
        const blob = await Packer.toBlob(buildDocument(editor.getJSON() as DocNode, exportOpts, title));
        downloadBlob(blob, `${safeName(title)}.docx`);
        toast.success("Word document downloaded");
      } catch {
        toast.error("Couldn't create the Word file.");
      }
    },
    print: () => editor && printDocument(editor.getHTML(), { title: safeName(title), ...exportOpts }),
    copyText: () => {
      if (!editor) return;
      void navigator.clipboard.writeText(editor.getText({ blockSeparator: "\n" }));
      toast.success("Text copied");
    },
    history: () => setHistoryOpen(true),
    remove: canEdit ? () => void remove() : undefined,
  };

  const conflictAuthor = conflict?.updated_by ? profiles[conflict.updated_by]?.display_name : null;
  const zoomPct = Math.round(zoom * 100);
  const setZoom = (z: number) => setPrefs({ ...prefs, zoom: Math.min(2, Math.max(0.5, Math.round(z * 100) / 100)) });

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onKeyDownCapture={() => (interacted.current = true)}
      onPointerDownCapture={() => (interacted.current = true)}
      onPasteCapture={() => (interacted.current = true)}
      onDropCapture={() => (interacted.current = true)}
      onBeforeInputCapture={() => (interacted.current = true)}
      onKeyDown={(e) => {
        const mod = e.metaKey || e.ctrlKey;
        if (mod && e.key.toLowerCase() === "s") {
          e.preventDefault();
          void save();
        } else if (mod && e.key.toLowerCase() === "p") {
          e.preventDefault();
          file.print();
        }
      }}
    >
      <style>{DOC_CSS}</style>

      {/* title bar */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <FileText className="size-5 shrink-0 text-primary" aria-hidden />
        <input
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          readOnly={readOnly}
          maxLength={120}
          aria-label="Document title"
          placeholder="Untitled document"
          className="min-w-0 flex-1 bg-transparent font-display text-lg font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50"
        />
        <span className={cn("hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex", status === "error" && "text-destructive")} role="status" aria-live="polite">
          {status === "saved" && <CheckCheck className="size-3.5 text-online" />}
          {STATUS_LABEL[status]}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={() => setHistoryOpen(true)} aria-label="Version history">
              <History />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Version history</TooltipContent>
        </Tooltip>
      </div>

      {/* banners */}
      {lockedBy && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-lg border bg-mark-yellow/30 px-3 py-2 text-sm" role="status">
          <Lock className="size-4 shrink-0" />
          <span>
            <strong className="font-semibold">{lockedBy.name}</strong> is editing this document. It unlocks a few seconds after they stop typing.
          </span>
        </div>
      )}
      {!canEdit && <div className="mx-4 mt-2 rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground">You have view-only access to documents in this room.</div>}
      {conflict && (
        <div className="mx-4 mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm" role="alert">
          <p className="font-medium">{conflictAuthor ?? "Someone"} saved a newer version while you were typing.</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={useTheirs}>Use their version</Button>
            <Button size="sm" onClick={keepMine}>Keep mine</Button>
          </div>
        </div>
      )}

      {/* ribbon */}
      <div className="mt-2">{editor && <Ribbon editor={editor} readOnly={readOnly} prefs={prefs} setPrefs={setPrefs} file={file} />}</div>

      {/* paper */}
      <div
        ref={canvasRef}
        onScroll={measurePages}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvas) {
            e.preventDefault();
            editor?.commands.focus("end");
          }
        }}
        className="thin-scroll min-h-0 flex-1 overflow-auto bg-[#E3E6EF] dark:bg-[#070B20]"
        data-canvas="true"
      >
        <div className="flex justify-center px-6 py-6" data-canvas="true">
          <div style={{ width: dims.w, zoom }} className="shrink-0">
            <div
              ref={paperRef}
              className="bg-white shadow-[0_2px_4px_rgba(16,26,51,.12),0_14px_40px_-12px_rgba(16,26,51,.35)]"
              style={{
                width: dims.w,
                minHeight: dims.h,
                padding: marginPx,
                backgroundImage: prefs.boundaries ? `linear-gradient(to bottom, transparent ${dims.h - 2}px, #C9CFE2 ${dims.h - 2}px, #C9CFE2 ${dims.h}px)` : undefined,
                backgroundSize: `100% ${dims.h}px`,
              }}
            >
              <div className="doc-body">{editor && <EditorContent editor={editor} />}</div>
            </div>
          </div>
        </div>
      </div>

      {/* status bar */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-card px-3 py-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-4 tabular-nums">
          <span>Page {page.current} of {page.total}</span>
          <span>{counts.words.toLocaleString()} {counts.words === 1 ? "word" : "words"}</span>
          <span className="hidden sm:inline">{counts.chars.toLocaleString()} characters</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom(zoom - 0.1)} className="rounded p-1 hover:bg-accent"><Minus className="size-3.5" /></button>
          <input type="range" min={50} max={200} step={5} value={zoomPct} onChange={(e) => setZoom(Number(e.target.value) / 100)} aria-label="Zoom" className="hidden h-1 w-28 accent-[var(--primary)] sm:block" />
          <button type="button" aria-label="Zoom in" onClick={() => setZoom(zoom + 0.1)} className="rounded p-1 hover:bg-accent"><Plus className="size-3.5" /></button>
          <button type="button" onClick={() => setPrefs({ ...prefs, zoom: "fit" })} title="Fit to window width" className="w-11 rounded py-0.5 text-right tabular-nums hover:bg-accent">{zoomPct}%</button>
        </div>
      </div>

      <VersionHistory noteId={note.id} canRestore={canEdit && !lockedBy} onRestore={restore} open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}
