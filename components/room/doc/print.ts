import { DOC_CSS } from "./doc-styles";

export interface PrintOptions {
  title: string;
  page: "letter" | "a4";
  landscape: boolean;
  marginPx: number;
}

/**
 * Opens the browser's print dialog for just the document, paginated properly with the chosen page size.
 * Choosing "Save as PDF" as the printer gives a PDF. Uses a hidden iframe, so pop-up blockers don't interfere.
 */
export function printDocument(html: string, o: PrintOptions) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const size = o.page === "a4" ? "A4" : "Letter";
  const safeTitle = o.title.replace(/[<>&]/g, "");
  const doc = iframe.contentDocument;
  if (!doc) return iframe.remove();
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title>
<style>
@page{size:${size} ${o.landscape ? "landscape" : "portrait"};margin:${Math.round(o.marginPx * 0.75)}pt}
html,body{margin:0;padding:0;background:#fff}
${DOC_CSS}
.doc-body th,.doc-body td{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.doc-body mark,.doc-body th{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.doc-body div[data-page-break]{border:0;margin:0}
.doc-body div[data-page-break]::after{display:none}
</style></head><body><div class="doc-body">${html}</div></body></html>`);
  doc.close();

  const run = () => {
    const w = iframe.contentWindow;
    if (!w) return iframe.remove();
    w.focus();
    w.print();
    setTimeout(() => iframe.remove(), 60_000);
  };
  // give fonts and images a moment to settle
  if (doc.readyState === "complete") setTimeout(run, 150);
  else iframe.onload = () => setTimeout(run, 150);
}
