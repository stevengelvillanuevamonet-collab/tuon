"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Words resolve from blur one after another. Meant for one headline per page.
 * The full sentence stays in `aria-label`, so screen readers don't hear it word by word.
 */
export function BlurText({ text, className, stagger = 0.055 }: { text: string; className?: string; stagger?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;

  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} aria-hidden className="inline-block whitespace-pre">
          <motion.span
            className={cn("inline-block")}
            initial={{ opacity: 0, filter: "blur(10px)", y: 10 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 + i * stagger, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
