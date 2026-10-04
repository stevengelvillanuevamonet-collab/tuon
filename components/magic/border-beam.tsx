"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Magic UI-style border beam: a light that travels around the parent's border. */
export function BorderBeam({
  size = 80,
  duration = 7,
  delay = 0,
  colorFrom = "#ffe45c",
  colorTo = "#2b44ff",
  borderWidth = 1.5,
  className,
}: {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
      style={{ borderWidth, borderStyle: "solid" }}
    >
      <motion.div
        className={cn("absolute aspect-square bg-gradient-to-l from-[var(--bb-from)] via-[var(--bb-to)] to-transparent", className)}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            "--bb-from": colorFrom,
            "--bb-to": colorTo,
          } as React.CSSProperties
        }
        initial={{ offsetDistance: "0%" }}
        animate={{ offsetDistance: "100%" }}
        transition={{ repeat: Infinity, ease: "linear", duration, delay: -delay }}
      />
    </div>
  );
}
