"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BorderBeam } from "@/components/magic/border-beam";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const people = {
  ligaya: { name: "Ligaya", color: "#E5484D" },
  miguel: { name: "Miguel", color: "#12A594" },
  andrea: { name: "Andrea", color: "#8E4EC6" },
};

const script = [
  { who: "ligaya", text: "may proof ba kayo ng spectral theorem?" },
  { who: "miguel", text: "idadagdag ko na sa notes, saglit lang" },
  { who: "andrea", text: "Ako na sa practice set. Kita tayo mamayang 8 para i-compare." },
] as const;

function Cursor({ name, color, className, path, duration }: { name: string; color: string; className?: string; path: { left: string[]; top: string[] }; duration: number }) {
  return (
    <motion.div
      aria-hidden
      className={cn("pointer-events-none absolute z-10", className)}
      initial={{ left: path.left[0], top: path.top[0] }}
      animate={{ left: path.left, top: path.top }}
      transition={{ duration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill={color}>
        <path d="M1 1l5.2 13 2-5.2L13.4 7 1 1z" stroke="white" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      <span className="ml-3 -mt-0.5 block w-fit rounded-md rounded-tl-none px-1.5 py-0.5 text-[11px] font-medium text-white" style={{ background: color }}>
        {name}
      </span>
    </motion.div>
  );
}

export function HeroDemo() {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(reduce ? script.length : 1);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setCount((c) => (c >= script.length + 2 ? 1 : c + 1)), 2400);
    return () => clearInterval(id);
  }, [reduce]);

  const shown = script.slice(0, Math.min(count, script.length));
  const typing = count < script.length ? script[count] : null;

  return (
    <div className="relative rounded-2xl border bg-card shadow-[0_30px_80px_-30px_rgba(16,26,51,0.35)]">
      <BorderBeam size={120} duration={9} />
      {/* window chrome */}
      <div className="flex items-center gap-3 border-b px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="rounded bg-mark-yellow px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#101a33]">MATH 2210</span>
          <span className="truncate font-medium">Finals barkada: Linear Algebra</span>
        </div>
        <div className="ml-auto flex -space-x-2">
          {Object.values(people).map((p) => (
            <Avatar key={p.name} className="size-6 ring-2 ring-card">
              <AvatarFallback style={{ background: p.color }} className="text-[9px]">
                {p.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-[1.35fr_1fr]">
        {/* notes */}
        <div className="relative min-h-[22rem] border-b p-6 md:border-r md:border-b-0">
          <Cursor name={people.miguel.name} color={people.miguel.color} path={{ left: ["16%", "52%", "38%"], top: ["56%", "62%", "78%"] }} duration={7} />
          <Cursor name={people.ligaya.name} color={people.ligaya.color} path={{ left: ["62%", "30%", "70%"], top: ["34%", "40%", "30%"] }} duration={9} />
          <h3 className="text-2xl font-bold">Eigenvalues: exam review</h3>
          <p className="mt-3 max-w-[34rem] text-[15px] leading-7">
            An eigenvector keeps its direction under <i>A</i>. The eigenvalue says{" "}
            <span className="mark mark-animate [animation-delay:0.6s]">how much it stretches</span>.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-7">
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">det(A − λI) = 0</code> gives every eigenvalue
            </li>
            <li>
              Symmetric matrices have{" "}
              <span className="mark mark-animate [--mark-color:var(--mark-mint)] [animation-delay:1.4s]">real eigenvalues only</span>
            </li>
            <li>
              Diagonalizable if there are{" "}
              <span className="mark mark-animate [--mark-color:var(--mark-pink)] [animation-delay:2.2s]">n independent eigenvectors</span>
            </li>
          </ul>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-2 rounded-full bg-online" aria-hidden />
            Miguel is editing this note
          </p>
        </div>

        {/* chat */}
        <div className="flex min-h-[22rem] flex-col justify-end gap-3 bg-muted/40 p-5">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((m) => {
              const p = people[m.who];
              return (
                <motion.div
                  key={m.text}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex gap-2.5"
                >
                  <Avatar className="mt-0.5 size-7">
                    <AvatarFallback style={{ background: p.color }}>{p.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold">{p.name}</div>
                    <p className="text-sm leading-snug text-foreground/90">{m.text}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div className="h-5 text-xs text-muted-foreground" aria-live="off">
            {typing && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex gap-0.5" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="size-1 rounded-full bg-muted-foreground" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </span>
                {people[typing.who].name} is typing
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
