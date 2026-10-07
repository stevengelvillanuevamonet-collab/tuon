"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import * as Y from "yjs";
import { CheckCheck, FileText, History, Loader2, Minus, Plus, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { deleteNote, saveNoteState } from "@/lib/actions/notes";
import { LOAD_ORIGIN, SEED_ORIGIN, fromB64, toB64 } from "@/lib/collab/encoding";
import { SupabaseYProvider, type CollabChannel, type ProviderStatus } from "@/lib/collab/supabase-provider";
import { createClient } from "@/lib/supabase/client";
import type { DocNode } from "@/lib/export-docx";
import type { Note, NoteVersion } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DOC_CSS } from "./doc/doc-styles";
import { buildExtensions, toDocHtml } from "./doc/extensions";
import { DEFAULT_PREFS, MARGIN_PX, loadPrefs, pageDims, savePrefs, type DocPrefs } from "./doc/prefs";
import { printDocument } from "./doc/print";
import { Ribbon } from "./doc/ribbon";
import { seedUpdateFromContent } from "./doc/seed";
import { useRoom } from "./room-provider";
import { VersionHistory } from "./version-history";

type Status = "saved" | "dirty" | "saving" | "error";
const STATUS_LABEL: Record<Status, string> = { saved: "Saved", dirty: "Unsaved changes", saving: "Saving…", error: "Couldn't save" };

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

interface Boot {
  doc: Y.Doc;
  provider: SupabaseYProvider;
  /** True when this note predates live editing and was converted from its saved text just now. */
  seeded: boolean;
}

/**
 * Opens a note as a shared document. Everyone in the room can type in it at once.
 *
 * 1. Load the last saved merged state from the database (or convert an older note's saved text).
 * 2. Join the note's private Realtime channel: from then on every change is sent to, and merged with, everyone else's.
 * 3. Render the editor once that is ready, so a document never flashes empty.
 */
export function NoteEditor({ note, onDeleted }: { note: Note; onDeleted: () => void }) {
  const { me, canEdit } = useRoom();
  const supabase = useMemo(() => createClient(), []);
  const [boot, setBoot] = useState<Boot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const openedContent = useRef(note.content);

  useEffect(() => {
    let cancelled = false;
    let provider: SupabaseYProvider | null = null;
    const doc = new Y.Doc();

    (async () => {
      const { data, error } = await supabase.from("note_states").select("ydoc").eq("note_id", note.id).maybeSingle();
      if (cancelled) return;
      if (error) return void setLoadError("Couldn't open this document. Check your connection and try again.");

      let seeded = false;
      if (data?.ydoc) Y.applyUpdate(doc, fromB64(data.ydoc), LOAD_ORIGIN);
      else if (openedContent.current.trim()) {
        Y.applyUpdate(doc, seedUpdateFromContent(openedContent.current), SEED_ORIGIN);
        seeded = true;
      }

      await supabase.realtime.setAuth(); // private channels check the signed-in user
      if (cancelled) return;
      const channel = supabase.channel(`note:${note.id}`, { config: { private: true, broadcast: { self: false } } });
      provider = new SupabaseYProvider({
        doc,
        channel: channel as unknown as CollabChannel,
        readOnly: !canEdit,
        onDestroy: () => void supabase.removeChannel(channel),
      });
      provider.awareness.setLocalStateField("user", { name: me.display_name, color: me.avatar_color });
      provider.connect();
      setBoot({ doc, provider, seeded });
    })();

    return () => {
      cancelled = true;
      provider?.destroy();
      doc.destroy();
      setBoot(null);
    };
  }, [supabase, note.id, canEdit, me.display_name, me.avatar_color]);

  if (loadError) return <p className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">{loadError}</p>;
  if (!boot)
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
        <Loader2 className="mr-2 size-4 animate-spin" /> Opening document
      </div>
    );
  return <LiveEditor key={note.id} note={note} boot={boot} onDeleted={onDeleted} />;
}

/**
 * A Word-style document editor with a ribbon, page canvas and status bar, editing a document shared with everyone in the room.
 *
 *  - Typing goes into a shared Yjs document. Other people's edits and cursors arrive live and are merged in place,
 *    so nobody is locked out and nothing is overwritten.
 *  - Autosave stores this browser's full document; the server merges it with what's already stored, so two people
 *    saving at once both keep their work.
 */
function LiveEditor({ note, boot, onDeleted }: { note: Note; boot: Boot; onDeleted: () => void }) {
  const { doc, provider, seeded } = boot;
  const { me, canEdit, setEditing, removeNote } = useRoom();
  const supabase = useMemo(() => createClient(), []);

  const [title, setTitle] = useState(note.title);
  const [status, setStatus] = useState<Status>("saved");
  const [live, setLive] = useState<ProviderStatus>(provider.status);
  const [peers, setPeers] = useState<{ key: string; name: string; color: string }[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [prefs, setPrefsState] = useState<DocPrefs>(DEFAULT_PREFS);
  const [canvasW, setCanvasW] = useState(0);
  const [page, setPage] = useState({ current: 1, total: 1 });
  const [counts, setCounts] = useState({ words: 0, chars: 0 });

  const dirty = useRef(false);
  const saving = useRef(false);
  const editRev = useRef(0); // bumps on every local edit, so a save can tell whether more typing happened meanwhile
  const titleDirty = useRef(false);
  const titleRef = useRef(note.title);
  const errorToasted = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const touchRef = useRef<() => void>(() => {});
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const interacted = useRef(false); // true once the person has typed, pasted, dropped or used the ribbon
  const canvasRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  // view preferences live on this device (page size, margins, zoom)
  useEffect(() => setPrefsState(loadPrefs()), []);
  const setPrefs = (p: DocPrefs) => {
    setPrefsState(p);
    savePrefs(p);
  };

  const readOnly = !canEdit;

  // ── editor ──
  const editor = useEditor(
    {
      extensions: buildExtensions({ doc, provider, user: { name: me.display_name, color: me.avatar_color } }),
      editable: !readOnly,
      immediatelyRender: false,
      editorProps: { attributes: { spellcheck: "true", "aria-label": "Document", "aria-multiline": "true" } },
      onUpdate: ({ editor: e }) => setCounts({ words: e.storage.characterCount.words(), chars: e.storage.characterCount.characters() }),
    },
    [],
  );
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    setCounts({ words: editor.storage.characterCount.words(), chars: editor.storage.characterCount.characters() });
  }, [editor]);

  // connection state and who else is in the document
  useEffect(() => provider.onStatus(setLive), [provider]);
  useEffect(() => {
    const aw = provider.awareness;
    const update = () => {
      const seen = new Map<string, { key: string; name: string; color: string }>();
      aw.getStates().forEach((state, clientId) => {
        const u = (state as { user?: { name?: string; color?: string } }).user;
        if (clientId === doc.clientID || !u?.name) return;
        seen.set(`${u.name}|${u.color}`, { key: `${u.name}|${u.color}`, name: u.name, color: u.color ?? "#8d98b8" });
      });
      setPeers([...seen.values()]);
    };
    aw.on("change", update);
    update();
    return () => aw.off("change", update);
  }, [provider, doc]);

  // view-only members can't announce themselves to peers, so they pick up newer saves from the database
  useEffect(() => {
    if (canEdit) return;
    let cancelled = false;
    void supabase
      .from("note_states")
      .select("ydoc")
      .eq("note_id", note.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.ydoc) Y.applyUpdate(doc, fromB64(data.ydoc), LOAD_ORIGIN);
      });
    return () => {
      cancelled = true;
    };
  }, [canEdit, supabase, note.id, note.version, doc]);

  // ── saving ──
  const scheduleSave = useCallback((delay = 1200) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveRef.current(), delay);
  }, []);

  const save = useCallback(async () => {
    clearTimeout(saveTimer.current);
    const ed = editorRef.current;
    if (!ed || ed.isDestroyed) return;
    if (saving.current) return void scheduleSave();
    saving.current = true;
    setStatus("saving");
    const rev = editRev.current;
    const sentTitle = titleDirty.current ? titleRef.current : undefined;
    const res = await saveNoteState({ noteId: note.id, title: sentTitle, content: ed.getHTML(), update: toB64(Y.encodeStateAsUpdate(doc)) });
    saving.current = false;

    if (res.ok) {
      errorToasted.current = false;
      if (sentTitle !== undefined && titleRef.current === sentTitle) titleDirty.current = false;
      if (editRev.current === rev) {
        dirty.current = false;
        setStatus("saved");
      } else {
        setStatus("dirty");
        scheduleSave();
      }
    } else {
      setStatus("error");
      if (!errorToasted.current) toast.error(res.error);
      errorToasted.current = true;
      scheduleSave(6000); // keep trying quietly; the text is still on screen
    }
  }, [note.id, doc, scheduleSave]);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const scheduleIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setEditing(null), 6000);
  }, [setEditing]);

  const touch = useCallback(() => {
    dirty.current = true;
    editRev.current++;
    setStatus((s) => (s === "saving" ? s : "dirty"));
    setEditing(note.id); // lets the notes list show a "someone is editing" dot
    scheduleSave();
    scheduleIdle();
  }, [note.id, setEditing, scheduleSave, scheduleIdle]);
  useEffect(() => {
    touchRef.current = touch;
  }, [touch]);

  // any change made in this browser (not one that arrived from someone else, or the initial load) counts as an edit
  useEffect(() => {
    if (readOnly) return;
    const onDocUpdate = (_update: Uint8Array, origin: unknown) => {
      if (origin === provider || origin === LOAD_ORIGIN || origin === SEED_ORIGIN) return;
      if (!interacted.current) return; // the editor tidying up after loading, not an edit
      touchRef.current();
    };
    doc.on("update", onDocUpdate);
    return () => doc.off("update", onDocUpdate);
  }, [doc, provider, readOnly]);

  // an older note was just converted to a live document: store it so the next person opens it directly
  const seedSaved = useRef(false);
  useEffect(() => {
    if (!editor || !seeded || readOnly || seedSaved.current) return;
    seedSaved.current = true;
    dirty.current = true;
    scheduleSave(300);
  }, [editor, seeded, readOnly, scheduleSave]);

  // a title someone else changed (arrives through the notes feed), unless I'm mid-edit on it
  useEffect(() => {
    if (titleDirty.current || note.title === titleRef.current) return;
    titleRef.current = note.title;
    setTitle(note.title);
  }, [note.title]);

  // flush on leave
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      clearTimeout(idleTimer.current);
      clearTimeout(saveTimer.current);
      if (dirty.current) void saveRef.current();
      setEditing(null);
    };
  }, [setEditing]);

  function onTitle(v: string) {
    setTitle(v);
    titleRef.current = v;
    titleDirty.current = true;
    touch();
  }

  function restore(v: NoteVersion) {
    if (!editor) return;
    // replaces the shared document in place, so everyone currently in it sees the restored version
    interacted.current = true;
    editor.commands.setContent(toDocHtml(v.content), { emitUpdate: true });
    setTitle(v.title);
    titleRef.current = v.title;
    titleDirty.current = true;
    touch();
    void saveRef.current();
  }

  async function remove() {
    if (!window.confirm(`Delete “${title}”? This removes its version history too, for everyone in the room.`)) return;
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
        {/* who else is in this document right now */}
        {peers.length > 0 && (
          <div className="flex shrink-0 items-center -space-x-1.5" aria-label={`${peers.length} other ${peers.length === 1 ? "person is" : "people are"} in this document`}>
            {peers.slice(0, 4).map((p) => (
              <Tooltip key={p.key}>
                <TooltipTrigger asChild>
                  <Avatar className="size-6 ring-2 ring-background">
                    <AvatarFallback style={{ background: p.color }}>{initials(p.name)}</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>{p.name}</TooltipContent>
              </Tooltip>
            ))}
            {peers.length > 4 && <span className="relative flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold ring-2 ring-background">+{peers.length - 4}</span>}
          </div>
        )}
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
      {live === "error" && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-lg border bg-mark-yellow/30 px-3 py-2 text-sm" role="status">
          <WifiOff className="size-4 shrink-0" />
          <span>Live sync is unavailable right now. Your changes still save, but others will only see them after they reload.</span>
        </div>
      )}
      {!canEdit && <div className="mx-4 mt-2 rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground">You have view-only access to documents in this room. You can still watch edits happen live.</div>}

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

      <VersionHistory noteId={note.id} canRestore={canEdit} onRestore={restore} open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}
