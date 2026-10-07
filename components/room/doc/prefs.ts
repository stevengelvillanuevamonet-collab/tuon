export type PageSize = "letter" | "a4";
export type MarginPreset = "normal" | "narrow" | "wide";

export interface DocPrefs {
  page: PageSize;
  landscape: boolean;
  margin: MarginPreset;
  /** 0.5 – 2, or "fit" to fit the page width into the window */
  zoom: number | "fit";
  boundaries: boolean;
}

export const DEFAULT_PREFS: DocPrefs = { page: "letter", landscape: false, margin: "normal", zoom: "fit", boundaries: true };
export const MARGIN_PX: Record<MarginPreset, number> = { narrow: 48, normal: 96, wide: 144 };
/** CSS pixel sizes at 96 dpi */
export const PAGE_PX: Record<PageSize, { w: number; h: number }> = { letter: { w: 816, h: 1056 }, a4: { w: 794, h: 1123 } };

export function pageDims(p: DocPrefs) {
  const { w, h } = PAGE_PX[p.page];
  return p.landscape ? { w: h, h: w } : { w, h };
}

const KEY = "tuon-doc-prefs";
export function loadPrefs(): DocPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}
export function savePrefs(p: DocPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}
