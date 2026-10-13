"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/** Magic UI-style spotlight card: a soft light follows the cursor across the surface. */
export function MagicCard({ children, className, size = 280 }: { children: React.ReactNode; className?: string; size?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <div ref={ref} onPointerMove={onMove} className={cn("group/magic relative isolate overflow-hidden", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/magic:opacity-100"
        style={{ background: `radial-gradient(${size}px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--primary) 16%, transparent), transparent 65%)` }}
      />
      {children}
    </div>
  );
}
