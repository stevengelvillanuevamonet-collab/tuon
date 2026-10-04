import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Tuon mark: a highlighter pen laid across a bookmark ribbon, forming a "T".
 * Source files live in /public/brand.
 */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const u = (n: string) => `${id}${n}`;
  return (
    <svg viewBox="0 0 96 96" className={cn("size-8", className)} aria-hidden fill="none">
      <defs>
      <linearGradient id={u("bg")} x1="6" y1="0" x2="90" y2="96" gradientUnits="userSpaceOnUse">
      <stop stopColor="#2A3CAE"/><stop offset="0.5" stopColor="#121E69"/><stop offset="1" stopColor="#080C30"/>
      </linearGradient>
      <radialGradient id={u("glow")} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(82 96) rotate(-125) scale(86)">
      <stop stopColor="#3350FF" stopOpacity="0.8"/><stop offset="1" stopColor="#3350FF" stopOpacity="0"/>
      </radialGradient>
      <radialGradient id={u("top")} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(30 4) rotate(35) scale(60)">
      <stop stopColor="#fff" stopOpacity="0.22"/><stop offset="1" stopColor="#fff" stopOpacity="0"/>
      </radialGradient>
      <linearGradient id={u("rim")} x1="48" y1="0" x2="48" y2="96" gradientUnits="userSpaceOnUse">
      <stop stopColor="#fff" stopOpacity="0.38"/><stop offset="0.5" stopColor="#fff" stopOpacity="0.04"/><stop offset="1" stopColor="#8FA0FF" stopOpacity="0.4"/>
      </linearGradient>
      <linearGradient id={u("stem")} x1="48" y1="30" x2="48" y2="80" gradientUnits="userSpaceOnUse">
      <stop stopColor="#FFFFFF"/><stop offset="1" stopColor="#AEBBFF"/>
      </linearGradient>
      <linearGradient id={u("hl")} x1="14" y1="0" x2="82" y2="0" gradientUnits="userSpaceOnUse">
      <stop stopColor="#FFBE1F"/><stop offset="0.7" stopColor="#FFE45C"/><stop offset="1" stopColor="#FFF4B0"/>
      </linearGradient>
      <filter id={u("sh")} x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.2" floodColor="#02041A" floodOpacity="0.55"/></filter>
      </defs>
      <rect width="96" height="96" rx="27" fill={`url(#${id}bg)`}/>
      <rect width="96" height="96" rx="27" fill={`url(#${id}glow)`}/>
      <rect width="96" height="96" rx="27" fill={`url(#${id}top)`}/>
      <rect x=".75" y=".75" width="94.5" height="94.5" rx="26.25" stroke={`url(#${id}rim)`} strokeWidth="1.5"/>
      <path d="M38.5 30H57.5V78.5L48 69.5L38.5 78.5Z" fill={`url(#${id}stem)`} stroke={`url(#${id}stem)`} strokeWidth="3.5" strokeLinejoin="round" filter={`url(#${id}sh)`}/>
      <g transform="rotate(-4 48 31)" filter={`url(#${id}sh)`}>
      <path d="M24 19.5H70.5L81 25.5Q83 27 82.2 29.4L79.5 37.5Q78.8 40 76.2 40H24Q16 40 16 29.75 16 19.5 24 19.5Z" fill={`url(#${id}hl)`}/>
      <path d="M24 19.5H70.5L74 21.5H24Q18 21.5 17 26 17.7 20 24 19.5Z" fill="#fff" fillOpacity=".4"/>
      <path d="M70.5 19.5L76.5 40" stroke="#B87B00" strokeOpacity=".35" strokeWidth="1.4"/>
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
