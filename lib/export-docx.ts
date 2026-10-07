import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
  convertInchesToTwip,
  PageOrientation,
  type ParagraphChild,
  type FileChild,
} from "docx";

type CellChild = Paragraph | Table;

/** Minimal shape of TipTap's JSON, so this file has no editor dependency and can run anywhere. */
export interface DocNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

export interface ExportOptions {
  page: "letter" | "a4";
  landscape: boolean;
  /** page margin in CSS pixels (96 per inch) */
  marginPx: number;
}

const PAGE_TWIPS = { letter: { width: 12240, height: 15840 }, a4: { width: 11906, height: 16838 } } as const;
const pxToTwip = (px: number) => Math.round(px * 15);

/** "Calibri, Carlito, sans-serif" -> "Calibri" */
function firstFont(css: unknown): string | undefined {
  if (typeof css !== "string") return undefined;
  return css.split(",")[0]?.replace(/["']/g, "").trim() || undefined;
}

/** "14pt" | "18px" | "11" -> docx half-points */
function halfPoints(size: unknown): number | undefined {
  if (typeof size !== "string") return undefined;
  const n = parseFloat(size);
  if (!Number.isFinite(n)) return undefined;
  const pt = size.trim().endsWith("px") ? n * 0.75 : n;
  return Math.round(pt * 2);
}

/** "#2b44ff" | "rgb(43, 68, 255)" -> "2B44FF" */
function hex(color: unknown): string | undefined {
  if (typeof color !== "string") return undefined;
  const c = color.trim();
  const m3 = /^#([0-9a-f]{3})$/i.exec(c);
  if (m3) return m3[1].split("").map((x) => x + x).join("").toUpperCase();
  const m6 = /^#([0-9a-f]{6})$/i.exec(c);
  if (m6) return m6[1].toUpperCase();
  const rgb = /^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(c);
  if (rgb) return [rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("").toUpperCase();
  return undefined;
}

const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

const HEADING = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];

interface Ctx {
  /** counter so every top-level numbered list restarts at 1 */
  orderedInstance: number;
  contentWidthTwips: number;
}

function runsFrom(nodes: DocNode[] | undefined, base: Record<string, unknown> = {}): ParagraphChild[] {
  const out: ParagraphChild[] = [];
  for (const n of nodes ?? []) {
    if (n.type === "hardBreak") {
      out.push(new TextRun({ break: 1 }));
      continue;
    }
    if (n.type !== "text" || n.text === undefined) continue;

    const props: Record<string, unknown> = { text: n.text, ...base };
    let link: string | undefined;
    for (const m of n.marks ?? []) {
      switch (m.type) {
        case "bold": props.bold = true; break;
        case "italic": props.italics = true; break;
        case "underline": props.underline = { type: UnderlineType.SINGLE }; break;
        case "strike": props.strike = true; break;
        case "subscript": props.subScript = true; break;
        case "superscript": props.superScript = true; break;
        case "code": props.font = "Consolas"; props.shading = { type: ShadingType.CLEAR, fill: "F1F3F9" }; break;
        case "highlight": {
          const fill = hex(m.attrs?.color) ?? "FFE45C";
          props.shading = { type: ShadingType.CLEAR, fill, color: "auto" };
          break;
        }
        case "link": link = String(m.attrs?.href ?? ""); break;
        case "textStyle": {
          const font = firstFont(m.attrs?.fontFamily);
          const size = halfPoints(m.attrs?.fontSize);
          const color = hex(m.attrs?.color);
          if (font) props.font = font;
          if (size) props.size = size;
          if (color) props.color = color;
          break;
        }
      }
    }
    if (link) {
      props.color = props.color ?? "0563C1";
      props.underline = { type: UnderlineType.SINGLE };
      out.push(new ExternalHyperlink({ link, children: [new TextRun(props as ConstructorParameters<typeof TextRun>[0])] }));
    } else {
      out.push(new TextRun(props as ConstructorParameters<typeof TextRun>[0]));
    }
  }
  return out;
}

function paragraphOptions(node: DocNode) {
  const a = node.attrs ?? {};
  const indent = Number(a.indent) || 0;
  const line = a.lineHeight ? Number(a.lineHeight) : undefined;
  return {
    alignment: typeof a.textAlign === "string" ? ALIGN[a.textAlign] : undefined,
    indent: indent ? { left: indent * 720 } : undefined,
    spacing: line && Number.isFinite(line) ? { line: Math.round(240 * line), lineRule: "auto" as const } : undefined,
  };
}

function convertBlock(node: DocNode, ctx: Ctx, opts: { level?: number; listRef?: string; instance?: number; quote?: boolean; task?: boolean; bold?: boolean } = {}): FileChild[] {
  switch (node.type) {
    case "paragraph":
      return [
        new Paragraph({
          children: runsFrom(node.content, { ...(opts.quote ? { italics: true, color: "444444" } : {}), ...(opts.bold ? { bold: true } : {}) }),
          ...paragraphOptions(node),
          ...(opts.listRef ? { numbering: { reference: opts.listRef, level: opts.level ?? 0, instance: opts.instance } } : {}),
          ...(opts.quote
            ? { indent: { left: 720 }, border: { left: { style: BorderStyle.SINGLE, size: 18, color: "B9C0D4", space: 10 } } }
            : {}),
        }),
      ];

    case "heading": {
      const lvl = Math.min(3, Math.max(1, Number(node.attrs?.level) || 1));
      return [new Paragraph({ heading: HEADING[lvl - 1], children: runsFrom(node.content), ...paragraphOptions(node) })];
    }

    case "bulletList":
    case "orderedList":
    case "taskList": {
      const ordered = node.type === "orderedList";
      const task = node.type === "taskList";
      const level = opts.level === undefined ? 0 : opts.level + 1;
      const instance = ordered ? (opts.level === undefined ? ++ctx.orderedInstance : opts.instance) : undefined;
      const ref = ordered ? "numbers" : "bullets";
      const out: FileChild[] = [];
      for (const li of node.content ?? []) {
        const checked = li.attrs?.checked === true;
        let first = true;
        for (const child of li.content ?? []) {
          if (child.type === "paragraph") {
            const runs = runsFrom(child.content);
            if (task && first) runs.unshift(new TextRun({ text: checked ? "\u2611 " : "\u2610 " }));
            out.push(
              new Paragraph({
                children: runs,
                ...paragraphOptions(child),
                ...(task ? { indent: { left: 360 + level * 360, hanging: 0 } } : { numbering: first ? { reference: ref, level, instance } : { reference: ref, level, instance } }),
              }),
            );
            first = false;
          } else {
            out.push(...convertBlock(child, ctx, { level, instance }));
          }
        }
      }
      return out;
    }

    case "blockquote":
      return (node.content ?? []).flatMap((c) => convertBlock(c, ctx, { quote: true }));

    case "codeBlock": {
      const text = (node.content ?? []).map((c) => c.text ?? "").join("");
      return text.split("\n").map(
        (line) =>
          new Paragraph({
            children: [new TextRun({ text: line, font: "Consolas", size: 20 })],
            shading: { type: ShadingType.CLEAR, fill: "F4F5F9" },
            spacing: { after: 0 },
          }),
      );
    }

    case "horizontalRule":
      return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } }, children: [] })];

    case "pageBreak":
      return [new Paragraph({ children: [new PageBreak()] })];

    case "table":
      return [convertTable(node, ctx)];

    default:
      return [];
  }
}

function convertTable(node: DocNode, ctx: Ctx): Table {
  const rows = node.content ?? [];
  const cols = Math.max(1, ...rows.map((r) => (r.content ?? []).reduce((n, c) => n + (Number(c.attrs?.colspan) || 1), 0)));
  const colWidth = Math.floor(ctx.contentWidthTwips / cols);
  const border = { style: BorderStyle.SINGLE, size: 4, color: "8A8FA3" } as const;
  return new Table({
    width: { size: ctx.contentWidthTwips, type: WidthType.DXA },
    columnWidths: Array.from({ length: cols }, () => colWidth),
    rows: rows.map(
      (r) =>
        new TableRow({
          tableHeader: (r.content ?? []).every((c) => c.type === "tableHeader"),
          children: (r.content ?? []).map((c) => {
            const span = Number(c.attrs?.colspan) || 1;
            const header = c.type === "tableHeader";
            const kids = (c.content ?? []).flatMap((b) => convertBlock(b, ctx, header ? { bold: true } : {})) as CellChild[];
            return new TableCell({
              columnSpan: span > 1 ? span : undefined,
              rowSpan: Number(c.attrs?.rowspan) > 1 ? Number(c.attrs?.rowspan) : undefined,
              width: { size: colWidth * span, type: WidthType.DXA },
              borders: { top: border, bottom: border, left: border, right: border },
              shading: header ? { type: ShadingType.CLEAR, fill: "F0F2F8", color: "auto" } : undefined,
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: kids.length ? kids : [new Paragraph({})],
            });
          }),
        }),
    ),
  });
}

export function buildDocument(json: DocNode, opts: ExportOptions, title = "Document"): Document {
  const size = PAGE_TWIPS[opts.page];
  const margin = pxToTwip(opts.marginPx);
  const pageWidth = opts.landscape ? size.height : size.width;
  const ctx: Ctx = { orderedInstance: 0, contentWidthTwips: pageWidth - margin * 2 };
  const children = (json.content ?? []).flatMap((n) => convertBlock(n, ctx));

  const bulletChars = ["\u2022", "\u25E6", "\u25AA", "\u2022", "\u25E6", "\u25AA", "\u2022", "\u25E6", "\u25AA"];
  const level = (i: number, fmt: (typeof LevelFormat)[keyof typeof LevelFormat], text: string) => ({
    level: i,
    format: fmt,
    text,
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: convertInchesToTwip(0.5 * (i + 1)), hanging: convertInchesToTwip(0.25) } } },
  });

  return new Document({
    title,
    creator: "Tuon",
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 }, paragraph: { spacing: { after: 160, line: 259 } } },
        heading1: { run: { font: "Calibri Light", size: 40, color: "2F5496" }, paragraph: { spacing: { before: 360, after: 120 } } },
        heading2: { run: { font: "Calibri Light", size: 32, color: "2F5496" }, paragraph: { spacing: { before: 280, after: 80 } } },
        heading3: { run: { font: "Calibri", size: 26, color: "1F3763" }, paragraph: { spacing: { before: 240, after: 80 } } },
      },
    },
    numbering: {
      config: [
        { reference: "bullets", levels: bulletChars.map((c, i) => level(i, LevelFormat.BULLET, c)) },
        { reference: "numbers", levels: Array.from({ length: 9 }, (_, i) => level(i, i % 3 === 0 ? LevelFormat.DECIMAL : i % 3 === 1 ? LevelFormat.LOWER_LETTER : LevelFormat.LOWER_ROMAN, `%${i + 1}.`)) },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: size.width, height: size.height, orientation: opts.landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
            margin: { top: margin, bottom: margin, left: margin, right: margin },
          },
        },
        children: children.length ? children : [new Paragraph({})],
      },
    ],
  });
}
