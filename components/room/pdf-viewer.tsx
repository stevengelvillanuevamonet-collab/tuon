"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ScanLine, ZoomIn, ZoomOut } from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { PageControls } from "./viewer-controls";

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

/**
 * Renders a PDF one page at a time with pdf.js (the "legacy" build, so older phones work too).
 * The PDF bytes come from the parent, so this component knows nothing about Supabase.
 */
export function PdfViewer({ data, onFailed }: { data: ArrayBuffer; onFailed?: (message: string) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [error, setError] = useState<string | null>(null);

  // load the document
  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | undefined;
    setDoc(null);
    setError(null);
    (async () => {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
      loadingTask = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) });
      const loaded = await loadingTask.promise;
      if (cancelled) return;
      setDoc(loaded);
      setPage(1);
    })().catch((e) => {
      if (cancelled) return;
      const msg = e?.name === "PasswordException" ? "This PDF is password-protected, so it can't be previewed. Download it to open it." : "This PDF couldn't be opened. It may be damaged. You can still download it.";
      setError(msg);
      onFailed?.(msg);
    });
    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // track the available space
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // draw the current page
  useEffect(() => {
    if (!doc || !size.w || !size.h) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    (async () => {
      const pdfPage = await doc.getPage(page);
      if (cancelled) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const fit = Math.min((size.w - 32) / base.width, (size.h - 32) / base.height);
      const cssScale = Math.max(0.05, fit * zoom);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = pdfPage.getViewport({ scale: cssScale * dpr });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
      task = pdfPage.render({ canvas, viewport });
      await task.promise;
    })().catch((e) => {
      if (e?.name !== "RenderingCancelledException" && !cancelled) setError("Couldn't draw this page.");
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, page, zoom, size]);

  const count = doc?.numPages ?? 0;
  const go = (p: number) => setPage(Math.min(Math.max(1, p), Math.max(1, count)));
  const stepZoom = (dir: 1 | -1) => {
    const i = ZOOM_STEPS.findIndex((z) => z >= zoom - 0.001);
    setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, (i === -1 ? ZOOM_STEPS.length - 1 : i) + dir))]);
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col outline-none"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") (e.preventDefault(), go(page + 1));
        else if (e.key === "ArrowLeft" || e.key === "PageUp") (e.preventDefault(), go(page - 1));
        else if (e.key === "Home") go(1);
        else if (e.key === "End") go(count);
        else if (e.key === "+" || e.key === "=") stepZoom(1);
        else if (e.key === "-") stepZoom(-1);
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b bg-card/60 px-3 py-1">
        <PageControls page={page} count={count} onChange={go} />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => stepZoom(-1)} disabled={zoom <= ZOOM_STEPS[0]} aria-label="Zoom out">
            <ZoomOut />
          </Button>
          <span className="w-12 text-center text-sm text-muted-foreground tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon-sm" onClick={() => stepZoom(1)} disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]} aria-label="Zoom in">
            <ZoomIn />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setZoom(1)} aria-label="Fit page">
            <ScanLine />
          </Button>
        </div>
      </div>
      <div ref={wrapRef} className="thin-scroll relative min-h-0 flex-1 overflow-auto bg-muted/60">
        {!doc && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Opening PDF
          </div>
        )}
        {error && <p className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-muted-foreground">{error}</p>}
        <div className="flex min-h-full min-w-full items-center justify-center p-4">
          <canvas ref={canvasRef} className="rounded-sm bg-white shadow-[0_8px_30px_-10px_rgba(16,26,51,.35)]" style={{ display: doc ? "block" : "none" }} />
        </div>
      </div>
    </div>
  );
}
