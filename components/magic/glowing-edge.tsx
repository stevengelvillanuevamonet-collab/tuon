"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Aceternity-style glowing effect: the border lights up on the side nearest the cursor,
 * starting a little before the cursor reaches the card. Does nothing on touch screens.
 */
export function GlowingEdge({ children, className, proximity = 140 }: { children: React.ReactNode; className?: string; proximity?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(hover: none)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const outside = Math.max(Math.abs(dx) - r.width / 2, Math.abs(dy) - r.height / 2, 0);
        el.style.setProperty("--glow-o", outside < proximity ? "1" : "0");
        el.style.setProperty("--glow-a", `${(Math.atan2(dy, dx) * 180) / Math.PI + 10}deg`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [proximity]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {children}
      <span aria-hidden className="glow-edge pointer-events-none absolute -inset-px rounded-[inherit]" />
    </div>
  );
}
