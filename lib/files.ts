export const FILE_BUCKET = "room-files";
export const MAX_FILE_BYTES = 50 * 1024 * 1024; // matches the bucket limit
export const ACCEPT = ".pdf,.pptx,.ppsx,.ppt,.pps";

export type FileKind = "pdf" | "pptx" | "ppt";

const EXT_KIND: Record<string, FileKind> = { pdf: "pdf", pptx: "pptx", ppsx: "pptx", ppt: "ppt", pps: "ppt" };
const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppsx: "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  ppt: "application/vnd.ms-powerpoint",
  pps: "application/vnd.ms-powerpoint",
};

export function extOf(name: string) {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

/** Decide how to show a file from its extension (browsers often report wrong MIME types for PowerPoint). */
export function fileKind(name: string): FileKind | null {
  return EXT_KIND[extOf(name)] ?? null;
}

export function mimeFor(name: string) {
  return EXT_MIME[extOf(name)] ?? "application/octet-stream";
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function validateFile(file: File): string | null {
  if (!fileKind(file.name)) return "Only PDF and PowerPoint files (.pdf, .pptx, .ppt) can be added.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_FILE_BYTES) return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_FILE_BYTES)}.`;
  return null;
}
