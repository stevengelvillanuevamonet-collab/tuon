import { Extension, Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { marked } from "marked";
import type * as Y from "yjs";
import { FIELD } from "@/lib/collab/encoding";
import type { SupabaseYProvider } from "@/lib/collab/supabase-provider";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraphFormat: {
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
      setLineSpacing: (value: string) => ReturnType;
    };
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

export const INDENT_PX = 48; // half an inch, like Word's default tab stop
const MAX_INDENT = 8;
const BLOCKS = ["paragraph", "heading"];

/** Paragraph-level formatting that Word has and plain editors don't: indentation and line spacing. */
export const ParagraphFormat = Extension.create({
  name: "paragraphFormat",

  addGlobalAttributes() {
    return [
      {
        types: BLOCKS,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => Number(el.getAttribute("data-indent")) || 0,
            renderHTML: (attrs) => (attrs.indent ? { "data-indent": attrs.indent, style: `margin-left:${attrs.indent * INDENT_PX}px` } : {}),
          },
          lineHeight: {
            default: null,
            parseHTML: (el) => el.getAttribute("data-line") || null,
            renderHTML: (attrs) => (attrs.lineHeight ? { "data-line": attrs.lineHeight, style: `line-height:${attrs.lineHeight}` } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    const shift = (delta: number) =>
      () =>
      ({ state, tr, dispatch }: { state: import("@tiptap/pm/state").EditorState; tr: import("@tiptap/pm/state").Transaction; dispatch?: (tr: import("@tiptap/pm/state").Transaction) => void }) => {
        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!BLOCKS.includes(node.type.name)) return;
          const next = Math.min(MAX_INDENT, Math.max(0, (node.attrs.indent ?? 0) + delta));
          if (next !== node.attrs.indent) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
            changed = true;
          }
        });
        if (changed && dispatch) dispatch(tr);
        return changed;
      };

    return {
      increaseIndent: shift(1),
      decreaseIndent: shift(-1),
      setLineSpacing:
        (value: string) =>
        ({ state, tr, dispatch }) => {
          const { from, to } = state.selection;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (BLOCKS.includes(node.type.name)) tr.setNodeMarkup(pos, undefined, { ...node.attrs, lineHeight: value === "1.15" ? null : value });
          });
          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    // Lists and tables already use Tab for their own purposes; everywhere else Tab indents, as in Word.
    const plainText = () => !this.editor.isActive("listItem") && !this.editor.isActive("taskItem") && !this.editor.isActive("table");
    return {
      Tab: () => (plainText() ? this.editor.commands.increaseIndent() : false),
      "Shift-Tab": () => (plainText() ? this.editor.commands.decreaseIndent() : false),
    };
  },
});

export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: "div[data-page-break]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-page-break": "true" })],
  addCommands() {
    return { setPageBreak: () => ({ commands }) => commands.insertContent([{ type: "pageBreak" }, { type: "paragraph" }]) };
  },
});

export interface CollabConfig {
  doc: Y.Doc;
  provider: SupabaseYProvider;
  user: { name: string; color: string };
}

/** A cursor with the person's name above it, like Google Docs. Colours come from each person's avatar colour. */
function renderCaret(user: Record<string, unknown>) {
  const caret = document.createElement("span");
  caret.className = "tuon-caret";
  caret.style.setProperty("--caret", String(user.color ?? "#2b44ff"));
  const label = document.createElement("span");
  label.className = "tuon-caret-label";
  label.textContent = String(user.name ?? "Someone");
  caret.append(label);
  return caret;
}

function renderSelection(user: Record<string, unknown>) {
  return { nodeName: "span", class: "tuon-selection", style: `background-color:${String(user.color ?? "#2b44ff")}33`, "data-user": String(user.name ?? "") };
}

/**
 * With `collab`, the document lives in a shared Yjs doc: every edit is merged with everyone else's as it happens
 * and other people's cursors are drawn. Without it (used only to convert old notes) it is a plain editor.
 */
export function buildExtensions(collab?: CollabConfig) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" } },
      // Yjs keeps its own undo stack so that Ctrl+Z only undoes *your* edits, never someone else's.
      ...(collab ? { undoRedo: false as const } : {}),
    }),
    TextStyleKit.configure({ backgroundColor: false, lineHeight: false }),
    TextAlign.configure({ types: BLOCKS }),
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit.configure({ table: { resizable: true } }),
    Placeholder.configure({ placeholder: "Start typing your notes…" }),
    CharacterCount,
    ParagraphFormat,
    PageBreak,
    ...(collab
      ? [
          Collaboration.configure({ document: collab.doc, field: FIELD }),
          CollaborationCaret.configure({ provider: collab.provider, user: collab.user, render: renderCaret, selectionRender: renderSelection }),
        ]
      : []),
  ];
}

/**
 * Notes written before documents were rich text are markdown. Convert them to HTML the first time they're opened.
 * (The editor's schema then filters the HTML, so nothing unsafe can get through.)
 */
export function toDocHtml(raw: string | null | undefined): string {
  const s = raw ?? "";
  if (!s.trim()) return "";
  if (/^\s*</.test(s)) return s; // already a document
  const html = marked.parse(s.replace(/==([^=\n]+)==/g, "<mark>$1</mark>"), { async: false, gfm: true }) as string;

  // The editor only starts in the browser, so on the server we can skip the checklist conversion below.
  if (typeof DOMParser === "undefined") return html;

  // turn markdown checklists into TipTap task lists
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("ul").forEach((ul) => {
    const items = Array.from(ul.children).filter((c) => c.tagName === "LI");
    const tasks = items.filter((li) => li.querySelector(":scope > input[type=checkbox]") || li.querySelector(":scope > p > input[type=checkbox]"));
    if (items.length && tasks.length === items.length) {
      ul.setAttribute("data-type", "taskList");
      items.forEach((li) => {
        const box = li.querySelector("input[type=checkbox]") as HTMLInputElement;
        li.setAttribute("data-type", "taskItem");
        li.setAttribute("data-checked", box.checked ? "true" : "false");
        box.remove();
      });
    }
  });
  return doc.body.innerHTML;
}

/** Plain text of a document's HTML, for version previews and word counts. */
export function htmlToText(html: string): string {
  if (typeof DOMParser === "undefined") return html.replace(/<[^>]+>/g, " ");
  return (new DOMParser().parseFromString(html, "text/html").body.textContent ?? "").replace(/\s+/g, " ").trim();
}
