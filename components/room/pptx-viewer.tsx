"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageControls } from "./viewer-controls";

const RENDER_WIDTH = 1280; // slides are drawn at this width, then scaled to fit with CSS

type PptxLike = { width: number; height: number };
type Previewer = { pptx: unknown; slideCount: number; load: (d: ArrayBuffer) => Promise<unknown>; renderSingleSlide: (i: number) => void; destroy: () => void };

/**
 * Draws .pptx slides in the browser with pptx-preview, one slide at a time.
 * Fidelity is good for text, images and common shapes. Charts, SmartArt and fancy animations may not match PowerPoint exactly.
 */
export function PptxViewer({ data, onFailed }: { data: ArrayBuffer; onFailed?: (message: string) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const previewer = useRef<Previewer | null>(null);
  const [count, setCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [dims, setDims] = useState({ w: RENDER_WIDTH, h: Math.round((RENDER_WIDTH * 9) / 16) });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCount(0);
    setIndex(0);
    setError(null);
    (async () => {
      const { init } = await import("pptx-preview");
      const host = hostRef.current;
      if (!host) return;
      host.innerHTML = "";
      const p = init(host, { width: RENDER_WIDTH, height: Math.round((RENDER_WIDTH * 9) / 16), mode: "list" }) as unknown as Previewer;
      await p.load(data);
      if (cancelled) return;
      const pw = p.pptx as unknown as PptxLike;
      previewer.current = p;
      setDims({ w: RENDER_WIDTH, h: Math.max(1, Math.round((RENDER_WIDTH * pw.height) / pw.width)) });
      setCount(p.slideCount);
      p.renderSingleSlide(0);
    })().catch(() => {
      if (cancelled) return;
      const msg = "This presentation couldn't be previewed here.";
      setError(msg);
      onFailed?.(msg);
    });
    return () => {
      cancelled = true;
      try {
        previewer.current?.destroy();
      } catch {}
      previewer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (count > 0) {
      try {
        previewer.current?.renderSingleSlide(index);
      } catch {}
    }
  }, [index, count]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = size.w ? Math.max(0.1, Math.min((size.w - 32) / dims.w, (size.h - 32) / dims.h)) : 1;
  const go = (p: number) => setIndex(Math.min(Math.max(1, p), Math.max(1, count)) - 1);

  return (
    <div
      className="flex h-full min-h-0 flex-col outline-none"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") (e.preventDefault(), go(index + 2));
        else if (e.key === "ArrowLeft" || e.key === "PageUp") (e.preventDefault(), go(index));
        else if (e.key === "Home") go(1);
        else if (e.key === "End") go(count);
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b bg-card/60 px-3 py-1">
        <PageControls page={index + 1} count={count} onChange={go} />
        <span className="hidden truncate text-xs text-muted-foreground 2xl:inline">Slide preview. Complex charts may look different from PowerPoint.</span>
      </div>
      <div ref={wrapRef} className="thin-scroll relative min-h-0 flex-1 overflow-auto bg-muted/60">
        {count === 0 && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Opening presentation
          </div>
        )}
        {error && <p className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-muted-foreground">{error}</p>}
        <div className="flex min-h-full min-w-full items-center justify-center p-4">
          <div style={{ width: dims.w * scale, height: dims.h * scale, display: count ? "block" : "none" }} className="overflow-hidden rounded-sm bg-white shadow-[0_8px_30px_-10px_rgba(16,26,51,.35)]">
            <div ref={hostRef} style={{ width: dims.w, height: dims.h, transform: `scale(${scale})`, transformOrigin: "top left" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
