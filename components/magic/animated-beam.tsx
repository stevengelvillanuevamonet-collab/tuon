"use client";

import { useEffect, useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Magic UI-style animated beam: a pulse of light travels along a curve between two elements. */
export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  duration = 3,
  delay = 0,
  className,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  fromRef: React.RefObject<HTMLElement | null>;
  toRef: React.RefObject<HTMLElement | null>;
  curvature?: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  const [path, setPath] = useState("");
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const from = fromRef.current;
      const to = toRef.current;
      if (!from || !to) return;
      const c = container.getBoundingClientRect();
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const x1 = a.left - c.left + a.width / 2;
      const y1 = a.top - c.top + a.height / 2;
      const x2 = b.left - c.left + b.width / 2;
      const y2 = b.top - c.top + b.height / 2;
      setPath(`M ${x1},${y1} Q ${(x1 + x2) / 2},${y1 - curvature} ${x2},${y2}`);
      setWidth(c.width);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, fromRef, toRef, curvature]);

  return (
    <svg aria-hidden className={cn("pointer-events-none absolute inset-0 size-full", className)} fill="none">
      <path d={path} stroke="var(--border)" strokeWidth={1.5} strokeLinecap="round" />
      {!reduce && (
        <>
          <path d={path} stroke={`url(#${id})`} strokeWidth={2.5} strokeLinecap="round" />
          <defs>
            <motion.linearGradient
              id={id}
              gradientUnits="userSpaceOnUse"
              initial={{ x1: -width * 0.2, x2: 0 }}
              animate={{ x1: [-width * 0.2, width], x2: [0, width * 1.2] }}
              transition={{ duration, delay, ease: "linear", repeat: Infinity, repeatDelay: 0.4 }}
            >
              <stop stopColor="#ffe45c" stopOpacity="0" />
              <stop stopColor="#ffe45c" />
              <stop offset="1" stopColor="#7b8cff" stopOpacity="0" />
            </motion.linearGradient>
          </defs>
        </>
      )}
    </svg>
  );
}
