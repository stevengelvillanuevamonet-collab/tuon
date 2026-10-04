import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Tuon mark: a glossy cobalt tile with a "T" whose crossbar is a highlighter stroke.
 * Source files live in /public/brand.
 */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const u = (n: string) => `${id}${n}`;
  return (
    <svg viewBox="0 0 96 96" className={cn("size-8 drop-shadow-sm", className)} aria-hidden fill="none">
      <defs>
        <linearGradient id={u("bg")} x1="10" y1="2" x2="86" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6F82FF" />
          <stop offset="0.5" stopColor="#2B44FF" />
          <stop offset="1" stopColor="#0F1766" />
        </linearGradient>
        <radialGradient id={u("glow")} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(26 14) rotate(45) scale(70)">
          <stop stopColor="#fff" stopOpacity="0.42" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={u("rim")} x1="48" y1="0" x2="48" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id={u("stem")} x1="48" y1="26" x2="48" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#C9D3FF" />
        </linearGradient>
        <linearGradient id={u("hl")} x1="16" y1="0" x2="80" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFC928" />
          <stop offset="0.6" stopColor="#FFE45C" />
          <stop offset="1" stopColor="#FFF1A0" />
        </linearGradient>
        <filter id={u("drop")} x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.6" floodColor="#070B45" floodOpacity="0.5" />
        </filter>
      </defs>
      <rect width="96" height="96" rx="28" fill={`url(#${u("bg")})`} />
      <rect width="96" height="96" rx="28" fill={`url(#${u("glow")})`} />
      <rect x="0.75" y="0.75" width="94.5" height="94.5" rx="27.25" stroke={`url(#${u("rim")})`} strokeWidth="1.5" />
      <rect x="37.5" y="30" width="21" height="52" rx="10.5" fill={`url(#${u("stem")})`} filter={`url(#${u("drop")})`} />
      <g transform="rotate(-5 48 31)" filter={`url(#${u("drop")})`}>
        <rect x="13" y="18" width="70" height="23" rx="7" fill={`url(#${u("hl")})`} />
        <rect x="13" y="18" width="70" height="7" rx="3.5" fill="#fff" fillOpacity="0.35" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight", className)}>
      <LogoMark />
      Tuon
    </span>
  );
}
