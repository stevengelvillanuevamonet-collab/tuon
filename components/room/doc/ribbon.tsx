"use client";

import { createContext, useContext, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, CalendarDays, ChevronDown, Code, Eraser, Highlighter, IndentDecrease, IndentIncrease,
  Italic, Link2, List, ListChecks, ListOrdered, Minus, Quote, Redo2, SeparatorHorizontal, Strikethrough, Subscript, Superscript, Underline, Undo2,
  Rows3, Columns3, Trash2, Table2, Combine, Split, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MARGIN_PX, type DocPrefs, type MarginPreset } from "./prefs";

const FONTS = [
  { label: "Calibri", css: 'Calibri, Carlito, "Segoe UI", sans-serif' },
  { label: "Arial", css: "Arial, Helvetica, sans-serif" },
  { label: "Times New Roman", css: '"Times New Roman", Times, serif' },
  { label: "Georgia", css: "Georgia, serif" },
  { label: "Verdana", css: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", css: '"Trebuchet MS", sans-serif' },
  { label: "Courier New", css: '"Courier New", Courier, monospace' },
  { label: "Comic Sans MS", css: '"Comic Sans MS", cursive' },
];
const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72];
const LINE_SPACINGS = ["1", "1.15", "1.5", "2", "2.5", "3"];
const TEXT_COLORS = ["#000000", "#44546A", "#C00000", "#ED7D31", "#BF9000", "#00B050", "#0070C0", "#2B44FF", "#7030A0", "#7F7F7F"];
const HIGHLIGHTS = [
  { name: "Yellow", color: "#FFE45C" }, { name: "Mint", color: "#9CECCB" }, { name: "Pink", color: "#FFB3CB" }, { name: "Sky", color: "#A5D8FF" },
  { name: "Orange", color: "#FFD8A8" }, { name: "Lavender", color: "#D0BFFF" }, { name: "Gray", color: "#DEE2E6" },
];

/** Called when a ribbon menu or dialog closes, so typing continues in the document instead of being lost. */
const RefocusCtx = createContext<() => void>(() => {});

type TabId = "home" | "insert" | "layout" | "view" | "table";

/** Keeps the editor's selection when a ribbon button is pressed. */
const keepFocus = (e: React.MouseEvent) => e.preventDefault();

function Btn({ label, active, disabled, onClick, children, className }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onMouseDown={keepFocus}
          onClick={onClick}
          className={cn("inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded px-1.5 text-[13px] transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35", active && "bg-primary/15 text-primary hover:bg-primary/20", className)}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-between border-r px-2 py-1 last:border-r-0">
      <div className="flex flex-col gap-0.5">{children}</div>
      <div className="mt-0.5 text-[10px] leading-none text-muted-foreground">{label}</div>
    </div>
  );
}
const Row = ({ children }: { children: React.ReactNode }) => <div className="flex items-center gap-0.5">{children}</div>;

function DropBtn({ label, children, trigger, width = "w-52", disabled, className }: { label: string; children: React.ReactNode; trigger: React.ReactNode; width?: string; disabled?: boolean; className?: string }) {
  const refocus = useContext(RefocusCtx);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button type="button" aria-label={label} onMouseDown={keepFocus} className={cn("inline-flex h-7 items-center gap-1 rounded px-1.5 text-[13px] outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35 data-[state=open]:bg-accent", className)}>
          {trigger}
          <ChevronDown className="size-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={width} onCloseAutoFocus={(e) => (e.preventDefault(), refocus())}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Swatches({ colors, current, onPick, onClear, clearLabel }: { colors: { name?: string; color: string }[]; current: string; onPick: (c: string) => void; onClear: () => void; clearLabel: string }) {
  return (
    <div className="p-1.5">
      <div className="grid grid-cols-5 gap-1.5 p-0.5">
        {colors.map((c) => (
          <DropdownMenuItem key={c.color} asChild onSelect={() => onPick(c.color)} className="relative size-7 rounded border p-0 hover:scale-110 data-[highlighted]:scale-110">
            <button type="button" title={c.name ?? c.color} aria-label={c.name ?? c.color} style={{ background: c.color }}>
              {current.toLowerCase() === c.color.toLowerCase() && <Check className="absolute inset-0 m-auto size-4" style={{ color: ["#000000", "#2B44FF", "#7030A0", "#44546A", "#C00000"].includes(c.color.toUpperCase()) ? "#fff" : "#000" }} />}
            </button>
          </DropdownMenuItem>
        ))}
      </div>
      <DropdownMenuItem onSelect={onClear} className="mt-1 text-xs">
        {clearLabel}
      </DropdownMenuItem>
      <label className="mt-0.5 flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs hover:bg-accent">
        <input type="color" className="size-5 cursor-pointer border-0 bg-transparent p-0" onChange={(e) => onPick(e.target.value)} aria-label="Custom colour" />
        More colours…
      </label>
    </div>
  );
}

function TableGrid({ onPick }: { onPick: (rows: number, cols: number) => void }) {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  return (
    <div className="p-2" onMouseLeave={() => setHover({ r: 0, c: 0 })}>
      <div className="mb-1.5 text-xs text-muted-foreground">{hover.r ? `${hover.c} × ${hover.r} table` : "Insert table"}</div>
      <div className="grid grid-cols-8 gap-0.5">
        {Array.from({ length: 48 }).map((_, i) => {
          const r = Math.floor(i / 8) + 1;
          const c = (i % 8) + 1;
          const on = r <= hover.r && c <= hover.c;
          return (
            <DropdownMenuItem key={i} asChild onSelect={() => onPick(r, c)} className="size-5 rounded-[3px] border p-0">
              <button type="button" aria-label={`${c} columns by ${r} rows`} onMouseEnter={() => setHover({ r, c })} onFocus={() => setHover({ r, c })} className={cn(on ? "border-primary bg-primary/25" : "bg-card")} />
            </DropdownMenuItem>
          );
        })}
      </div>
    </div>
  );
}

export interface RibbonProps {
  editor: Editor;
  readOnly: boolean;
  prefs: DocPrefs;
  setPrefs: (p: DocPrefs) => void;
  file: { downloadDocx: () => void; print: () => void; copyText: () => void; history: () => void; remove?: () => void };
}

export function Ribbon({ editor, readOnly, prefs, setPrefs, file }: RibbonProps) {
  const [tab, setTab] = useState<TabId>("home");
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");

  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const ts = e.getAttributes("textStyle");
      const blk = e.isActive("heading") ? e.getAttributes("heading") : e.getAttributes("paragraph");
      return {
        bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"), strike: e.isActive("strike"),
        sub: e.isActive("subscript"), sup: e.isActive("superscript"), code: e.isActive("code"),
        bullet: e.isActive("bulletList"), ordered: e.isActive("orderedList"), task: e.isActive("taskList"),
        quote: e.isActive("blockquote"), codeBlock: e.isActive("codeBlock"),
        h1: e.isActive("heading", { level: 1 }), h2: e.isActive("heading", { level: 2 }), h3: e.isActive("heading", { level: 3 }),
        align: (blk.textAlign as string | undefined) ?? "left",
        lineHeight: (blk.lineHeight as string | null) ?? "1.15",
        font: (ts.fontFamily as string | undefined) ?? "", size: (ts.fontSize as string | undefined) ?? "",
        color: (ts.color as string | undefined) ?? "", highlight: (e.getAttributes("highlight").color as string | undefined) ?? "",
        link: e.isActive("link"), inTable: e.isActive("table"), header: e.isActive("tableHeader"),
        canUndo: e.can().undo(), canRedo: e.can().redo(),
        canMerge: e.can().mergeCells(), canSplit: e.can().splitCell(),
      };
    },
  });

  // Return keyboard focus to the document, unless the person has already opened another ribbon menu (don't steal its focus).
  const refocusEditor = () => {
    if (document.querySelector('[data-radix-menu-content][data-state="open"]')) return;
    editor.view.focus();
    editor.commands.focus();
  };
  const run = () => editor.chain().focus();
  const dis = readOnly;
  const curFont = FONTS.find((f) => st.font && f.css.split(",")[0].replace(/["']/g, "").trim() === st.font.split(",")[0].replace(/["']/g, "").trim());
  const curSize = st.size ? parseFloat(st.size) : 11;
  const step = (dir: 1 | -1) => {
    const i = SIZES.findIndex((s) => s >= curSize - 0.001);
    const next = SIZES[Math.min(SIZES.length - 1, Math.max(0, (i === -1 ? SIZES.length - 1 : i) + dir))];
    run().setFontSize(`${next}pt`).run();
  };
  const openLink = () => {
    setHref((editor.getAttributes("link").href as string | undefined) ?? "https://");
    setLinkOpen(true);
  };
  const applyLink = () => {
    const url = href.trim();
    if (!url || url === "https://") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: /^(https?:|mailto:)/i.test(url) ? url : `https://${url}` }).run();
    setLinkOpen(false);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "home", label: "Home" }, { id: "insert", label: "Insert" }, { id: "layout", label: "Layout" }, { id: "view", label: "View" },
    ...(st.inTable ? [{ id: "table" as TabId, label: "Table" }] : []),
  ];
  const activeTab = tab === "table" && !st.inTable ? "home" : tab;

  const styleCard = (label: string, active: boolean, onClick: () => void, sample: React.CSSProperties) => (
    <button key={label} type="button" onMouseDown={keepFocus} onClick={onClick} disabled={dis} aria-pressed={active} className={cn("flex h-[52px] w-[74px] shrink-0 flex-col items-start justify-between rounded border bg-card px-2 py-1.5 text-left outline-none hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40", active && "border-primary ring-1 ring-primary")}>
      <span className="leading-none" style={sample}>Aa</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </button>
  );

  return (
    <RefocusCtx.Provider value={refocusEditor}>
    <div className="shrink-0 border-b bg-card" role="toolbar" aria-label="Document formatting">
      {/* tab strip */}
      <div className="flex items-end gap-0.5 overflow-x-auto bg-muted/50 px-2 pt-1">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button" className="mb-0.5 mr-1 inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring">
              File
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60" onCloseAutoFocus={(e) => (e.preventDefault(), editor.commands.focus())}>
            <DropdownMenuLabel>Export</DropdownMenuLabel>
            <DropdownMenuItem onSelect={file.downloadDocx}>Download as Word (.docx)</DropdownMenuItem>
            <DropdownMenuItem onSelect={file.print}>
              Print or save as PDF… <span className="ml-auto text-xs text-muted-foreground">Ctrl+P</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={file.copyText}>Copy all text</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={file.history}>Version history</DropdownMenuItem>
            {file.remove && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={file.remove}>
                  <Trash2 /> Delete document
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id} onClick={() => setTab(t.id)} className={cn("shrink-0 rounded-t-md px-3.5 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring", activeTab === t.id ? "bg-card font-medium text-foreground" : "text-muted-foreground hover:text-foreground", t.id === "table" && "text-primary")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ribbon body */}
      <div className="thin-scroll flex h-[88px] items-stretch overflow-x-auto border-t bg-card">
        {activeTab === "home" && (
          <>
            <Group label="Undo">
              <Row><Btn label="Undo (Ctrl+Z)" disabled={dis || !st.canUndo} onClick={() => run().undo().run()}><Undo2 className="size-4" /></Btn></Row>
              <Row><Btn label="Redo (Ctrl+Y)" disabled={dis || !st.canRedo} onClick={() => run().redo().run()}><Redo2 className="size-4" /></Btn></Row>
            </Group>

            <Group label="Font">
              <Row>
                <DropBtn label="Font" disabled={dis} width="w-56" trigger={<span className="w-[104px] truncate text-left" style={{ fontFamily: curFont?.css }}>{curFont?.label ?? "Calibri"}</span>}>
                  {FONTS.map((f) => (
                    <DropdownMenuItem key={f.label} onSelect={() => run().setFontFamily(f.css).run()} style={{ fontFamily: f.css }}>
                      {f.label}
                    </DropdownMenuItem>
                  ))}
                </DropBtn>
                <DropBtn label="Font size" disabled={dis} width="w-24" trigger={<span className="w-7 text-center tabular-nums">{curSize}</span>}>
                  {SIZES.map((s) => (
                    <DropdownMenuItem key={s} onSelect={() => run().setFontSize(`${s}pt`).run()}>{s}</DropdownMenuItem>
                  ))}
                </DropBtn>
                <Btn label="Increase font size" disabled={dis} onClick={() => step(1)}><span className="text-[15px] font-semibold leading-none">A<sup className="text-[9px]">▲</sup></span></Btn>
                <Btn label="Decrease font size" disabled={dis} onClick={() => step(-1)}><span className="text-[12px] font-semibold leading-none">A<sup className="text-[8px]">▼</sup></span></Btn>
                <Btn label="Clear formatting" disabled={dis} onClick={() => run().unsetAllMarks().clearNodes().run()}><Eraser className="size-4" /></Btn>
              </Row>
              <Row>
                <Btn label="Bold (Ctrl+B)" active={st.bold} disabled={dis} onClick={() => run().toggleBold().run()}><Bold className="size-4" /></Btn>
                <Btn label="Italic (Ctrl+I)" active={st.italic} disabled={dis} onClick={() => run().toggleItalic().run()}><Italic className="size-4" /></Btn>
                <Btn label="Underline (Ctrl+U)" active={st.underline} disabled={dis} onClick={() => run().toggleUnderline().run()}><Underline className="size-4" /></Btn>
                <Btn label="Strikethrough" active={st.strike} disabled={dis} onClick={() => run().toggleStrike().run()}><Strikethrough className="size-4" /></Btn>
                <Btn label="Subscript" active={st.sub} disabled={dis} onClick={() => run().toggleSubscript().run()}><Subscript className="size-4" /></Btn>
                <Btn label="Superscript" active={st.sup} disabled={dis} onClick={() => run().toggleSuperscript().run()}><Superscript className="size-4" /></Btn>
                <DropBtn label="Highlight colour" disabled={dis} width="w-48" trigger={<span className="relative"><Highlighter className="size-4" /><span className="absolute -bottom-1 left-0 h-[3px] w-full rounded" style={{ background: st.highlight || "#FFE45C" }} /></span>}>
                  <Swatches colors={HIGHLIGHTS} current={st.highlight} clearLabel="No highlight" onPick={(c) => run().setHighlight({ color: c }).run()} onClear={() => run().unsetHighlight().run()} />
                </DropBtn>
                <DropBtn label="Font colour" disabled={dis} width="w-48" trigger={<span className="relative text-[15px] font-semibold leading-none">A<span className="absolute -bottom-1 left-0 h-[3px] w-full rounded" style={{ background: st.color || "#C00000" }} /></span>}>
                  <Swatches colors={TEXT_COLORS.map((c) => ({ color: c }))} current={st.color} clearLabel="Automatic" onPick={(c) => run().setColor(c).run()} onClear={() => run().unsetColor().run()} />
                </DropBtn>
              </Row>
            </Group>

            <Group label="Paragraph">
              <Row>
                <Btn label="Bulleted list" active={st.bullet} disabled={dis} onClick={() => run().toggleBulletList().run()}><List className="size-4" /></Btn>
                <Btn label="Numbered list" active={st.ordered} disabled={dis} onClick={() => run().toggleOrderedList().run()}><ListOrdered className="size-4" /></Btn>
                <Btn label="Checklist" active={st.task} disabled={dis} onClick={() => run().toggleTaskList().run()}><ListChecks className="size-4" /></Btn>
                <Btn label="Decrease indent" disabled={dis} onClick={() => (st.bullet || st.ordered ? run().liftListItem("listItem").run() : st.task ? run().liftListItem("taskItem").run() : run().decreaseIndent().run())}><IndentDecrease className="size-4" /></Btn>
                <Btn label="Increase indent" disabled={dis} onClick={() => (st.bullet || st.ordered ? run().sinkListItem("listItem").run() : st.task ? run().sinkListItem("taskItem").run() : run().increaseIndent().run())}><IndentIncrease className="size-4" /></Btn>
              </Row>
              <Row>
                <Btn label="Align left (Ctrl+Shift+L)" active={st.align === "left"} disabled={dis} onClick={() => run().setTextAlign("left").run()}><AlignLeft className="size-4" /></Btn>
                <Btn label="Centre (Ctrl+Shift+E)" active={st.align === "center"} disabled={dis} onClick={() => run().setTextAlign("center").run()}><AlignCenter className="size-4" /></Btn>
                <Btn label="Align right (Ctrl+Shift+R)" active={st.align === "right"} disabled={dis} onClick={() => run().setTextAlign("right").run()}><AlignRight className="size-4" /></Btn>
                <Btn label="Justify (Ctrl+Shift+J)" active={st.align === "justify"} disabled={dis} onClick={() => run().setTextAlign("justify").run()}><AlignJustify className="size-4" /></Btn>
                <DropBtn label="Line spacing" disabled={dis} width="w-36" trigger={<span className="text-xs tabular-nums">↕ {st.lineHeight}</span>}>
                  {LINE_SPACINGS.map((l) => (
                    <DropdownMenuItem key={l} onSelect={() => run().setLineSpacing(l).run()}>
                      {l} {st.lineHeight === l && <Check className="ml-auto !text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropBtn>
              </Row>
            </Group>

            <Group label="Styles">
              <div className="flex gap-1.5">
                {styleCard("Normal", !st.h1 && !st.h2 && !st.h3 && !st.quote && !st.codeBlock, () => run().setParagraph().run(), { fontSize: 15 })}
                {styleCard("Heading 1", st.h1, () => run().toggleHeading({ level: 1 }).run(), { fontSize: 19, color: "#2f5496" })}
                {styleCard("Heading 2", st.h2, () => run().toggleHeading({ level: 2 }).run(), { fontSize: 16, color: "#2f5496" })}
                {styleCard("Heading 3", st.h3, () => run().toggleHeading({ level: 3 }).run(), { fontSize: 14, color: "#1f3763" })}
                {styleCard("Quote", st.quote, () => run().toggleBlockquote().run(), { fontSize: 15, fontStyle: "italic" })}
                {styleCard("Code", st.codeBlock, () => run().toggleCodeBlock().run(), { fontSize: 14, fontFamily: "monospace" })}
              </div>
            </Group>
          </>
        )}

        {activeTab === "insert" && (
          <>
            <Group label="Tables">
              <DropBtn label="Insert table" disabled={dis} width="w-auto" className="h-[52px] flex-col justify-center gap-0.5 px-3" trigger={<span className="flex flex-col items-center gap-0.5"><Table2 className="size-6" /><span className="text-xs">Table</span></span>}>
                <TableGrid onPick={(rows, cols) => run().insertTable({ rows, cols, withHeaderRow: true }).run()} />
              </DropBtn>
            </Group>
            <Group label="Links">
              <Btn label="Insert link" active={st.link} disabled={dis} onClick={openLink} className="h-[52px] w-14 flex-col gap-0.5"><Link2 className="size-6" /><span className="text-xs">Link</span></Btn>
            </Group>
            <Group label="Text">
              <Row>
                <Btn label="Checklist" active={st.task} disabled={dis} onClick={() => run().toggleTaskList().run()} className="gap-1.5"><ListChecks className="size-4" /> Checklist</Btn>
                <Btn label="Quote" active={st.quote} disabled={dis} onClick={() => run().toggleBlockquote().run()} className="gap-1.5"><Quote className="size-4" /> Quote</Btn>
              </Row>
              <Row>
                <Btn label="Code block" active={st.codeBlock} disabled={dis} onClick={() => run().toggleCodeBlock().run()} className="gap-1.5"><Code className="size-4" /> Code</Btn>
                <Btn label="Insert today's date" disabled={dis} onClick={() => run().insertContent(new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })).run()} className="gap-1.5"><CalendarDays className="size-4" /> Date</Btn>
              </Row>
            </Group>
            <Group label="Page">
              <Row><Btn label="Horizontal line" disabled={dis} onClick={() => run().setHorizontalRule().run()} className="gap-1.5"><Minus className="size-4" /> Line</Btn></Row>
              <Row><Btn label="Page break" disabled={dis} onClick={() => run().setPageBreak().run()} className="gap-1.5"><SeparatorHorizontal className="size-4" /> Page break</Btn></Row>
            </Group>
          </>
        )}

        {activeTab === "layout" && (
          <>
            <Group label="Page setup">
              <Row>
                <DropBtn label="Paper size" width="w-44" trigger={<span className="px-1 text-[13px]">Size: {prefs.page === "a4" ? "A4" : "Letter"}</span>}>
                  <DropdownMenuItem onSelect={() => setPrefs({ ...prefs, page: "letter" })}>Letter (8.5″ × 11″) {prefs.page === "letter" && <Check className="ml-auto" />}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setPrefs({ ...prefs, page: "a4" })}>A4 (210 × 297 mm) {prefs.page === "a4" && <Check className="ml-auto" />}</DropdownMenuItem>
                </DropBtn>
                <DropBtn label="Orientation" width="w-40" trigger={<span className="px-1 text-[13px]">{prefs.landscape ? "Landscape" : "Portrait"}</span>}>
                  <DropdownMenuItem onSelect={() => setPrefs({ ...prefs, landscape: false })}>Portrait {!prefs.landscape && <Check className="ml-auto" />}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setPrefs({ ...prefs, landscape: true })}>Landscape {prefs.landscape && <Check className="ml-auto" />}</DropdownMenuItem>
                </DropBtn>
              </Row>
              <Row>
                <DropBtn label="Margins" width="w-48" trigger={<span className="px-1 text-[13px] capitalize">Margins: {prefs.margin}</span>}>
                  {(["normal", "narrow", "wide"] as MarginPreset[]).map((m) => (
                    <DropdownMenuItem key={m} onSelect={() => setPrefs({ ...prefs, margin: m })} className="capitalize">
                      {m} <span className="ml-auto text-xs text-muted-foreground">{MARGIN_PX[m] / 96}″</span>
                    </DropdownMenuItem>
                  ))}
                </DropBtn>
              </Row>
            </Group>
            <Group label="Applies to">
              <p className="max-w-56 py-1 text-xs leading-snug text-muted-foreground">These settings are used for Word and PDF export, and are saved on this device.</p>
            </Group>
          </>
        )}

        {activeTab === "view" && (
          <>
            <Group label="Zoom">
              <Row>
                {[0.75, 1, 1.25, 1.5].map((z) => (
                  <Btn key={z} label={`${z * 100}%`} active={prefs.zoom === z} onClick={() => setPrefs({ ...prefs, zoom: z })} className="px-2">{z * 100}%</Btn>
                ))}
              </Row>
              <Row><Btn label="Fit to window width" active={prefs.zoom === "fit"} onClick={() => setPrefs({ ...prefs, zoom: "fit" })} className="px-2">Fit width</Btn></Row>
            </Group>
            <Group label="Show">
              <Row>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[13px] hover:bg-accent">
                  <input type="checkbox" checked={prefs.boundaries} onChange={(e) => setPrefs({ ...prefs, boundaries: e.target.checked })} className="size-4 accent-[var(--primary)]" />
                  Page boundaries
                </label>
              </Row>
            </Group>
          </>
        )}

        {activeTab === "table" && st.inTable && (
          <>
            <Group label="Rows">
              <Row><Btn label="Insert row above" disabled={dis} onClick={() => run().addRowBefore().run()} className="gap-1.5"><Rows3 className="size-4" /> Above</Btn><Btn label="Insert row below" disabled={dis} onClick={() => run().addRowAfter().run()} className="gap-1.5"><Rows3 className="size-4" /> Below</Btn></Row>
              <Row><Btn label="Delete row" disabled={dis} onClick={() => run().deleteRow().run()} className="gap-1.5 text-destructive"><Trash2 className="size-4" /> Delete row</Btn></Row>
            </Group>
            <Group label="Columns">
              <Row><Btn label="Insert column left" disabled={dis} onClick={() => run().addColumnBefore().run()} className="gap-1.5"><Columns3 className="size-4" /> Left</Btn><Btn label="Insert column right" disabled={dis} onClick={() => run().addColumnAfter().run()} className="gap-1.5"><Columns3 className="size-4" /> Right</Btn></Row>
              <Row><Btn label="Delete column" disabled={dis} onClick={() => run().deleteColumn().run()} className="gap-1.5 text-destructive"><Trash2 className="size-4" /> Delete column</Btn></Row>
            </Group>
            <Group label="Cells">
              <Row><Btn label="Merge cells" disabled={dis || !st.canMerge} onClick={() => run().mergeCells().run()} className="gap-1.5"><Combine className="size-4" /> Merge</Btn><Btn label="Split cell" disabled={dis || !st.canSplit} onClick={() => run().splitCell().run()} className="gap-1.5"><Split className="size-4" /> Split</Btn></Row>
              <Row><Btn label="Toggle header row" active={st.header} disabled={dis} onClick={() => run().toggleHeaderRow().run()} className="px-2">Header row</Btn></Row>
            </Group>
            <Group label="Table">
              <Row><Btn label="Delete table" disabled={dis} onClick={() => run().deleteTable().run()} className="gap-1.5 text-destructive"><Trash2 className="size-4" /> Delete table</Btn></Row>
            </Group>
          </>
        )}
      </div>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent onCloseAutoFocus={(e) => (e.preventDefault(), editor.commands.focus())}>
          <DialogHeader>
            <DialogTitle>Insert link</DialogTitle>
            <DialogDescription>Select some text first to turn it into a link. Leave the address empty to remove an existing link.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => (e.preventDefault(), applyLink())} className="grid gap-3">
            <Input autoFocus value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://example.com" aria-label="Link address" />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setLinkOpen(false)}>Cancel</Button>
              <Button type="submit">Apply</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </RefocusCtx.Provider>
  );
}
