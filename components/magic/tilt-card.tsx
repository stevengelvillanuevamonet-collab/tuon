"use client";

import { motion, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

/** Aceternity-style 3D tilt: the child rotates in real perspective toward the cursor. Mouse only, off with reduced motion. */
export function TiltCard({ children, className, max = 4 }: { children: React.ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const rx = useSpring(0, { stiffness: 180, damping: 22 });
  const ry = useSpring(0, { stiffness: 180, damping: 22 });

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * max * 2);
    ry.set(((e.clientX - r.left) / r.width - 0.5) * max * 2);
  }
  function reset() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <div className={cn("[perspective:1400px]", className)} onPointerMove={onMove} onPointerLeave={reset}>
      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}>{children}</motion.div>
    </div>
  );
}
