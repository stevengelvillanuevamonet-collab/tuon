"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Lock } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { AnimatedBeam } from "@/components/magic/animated-beam";
import { TiltCard } from "@/components/magic/tilt-card";

/**
 * The right-hand panel on the sign-in / sign-up pages.
 * It has no background of its own: the Aurora scene runs behind the whole page, so the form and this
 * panel share one atmosphere. The mini-room is frosted glass and follows the cursor in 3D.
 */

const people = {
  ligaya: { name: "Ligaya", color: "#E5484D" },
  miguel: { name: "Miguel", color: "#12A594" },
  andrea: { name: "Andrea", color: "#8E4EC6" },
} as const;

const script = [
  { who: "ligaya", text: "may proof ba kayo ng spectral theorem?" },
  { who: "miguel", text: "idadagdag ko na sa notes, saglit lang" },
  { who: "andrea", text: "Ako na sa practice set. Kita tayo mamayang 8." },
  { who: "ligaya", text: "Salamat! Nakita ko na yung highlights." },
] as const;

function Cursor({ name, color, path, duration, delay = 0 }: { name: string; color: string; path: { left: string[]; top: string[] }; duration: number; delay?: number }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute z-10"
      initial={{ left: path.left[0], top: path.top[0] }}
      animate={{ left: path.left, top: path.top }}
      transition={{ duration, delay, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
    >
      <svg width="18" height="18" viewBox="0 0 16 16" fill={color}>
        <path d="M1 1l5.2 13 2-5.2L13.4 7 1 1z" stroke="white" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      <span className="-mt-0.5 ml-3 block w-fit rounded-md rounded-tl-none px-1.5 py-0.5 text-[11px] font-medium text-white" style={{ background: color }}>
        {name}
      </span>
    </motion.div>
  );
}

function Initial({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white" style={{ background: color, width: size, height: size, fontSize: size * 0.4 }}>
      {name.slice(0, 1)}
    </span>
  );
}

function PresenceCard({ float }: { float?: { y: number[] } }) {
  const container = useRef<HTMLDivElement>(null);
  const a = useRef<HTMLSpanElement>(null);
  const b = useRef<HTMLSpanElement>(null);
  const c = useRef<HTMLSpanElement>(null);
  const room = useRef<HTMLSpanElement>(null);
  const refs = [a, b, c];
  const list = Object.values(people);

  return (
    <motion.div className="glass absolute top-[430px] left-3 z-20 rounded-2xl px-4 py-3 shadow-xl" animate={float} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
      <div ref={container} className="relative flex items-center gap-11">
        <div className="flex flex-col gap-1.5">
          {list.map((p, i) => (
            <span key={p.name} ref={refs[i]} className="relative z-10 rounded-full ring-2 ring-card">
              <Initial name={p.name} color={p.color} size={24} />
            </span>
          ))}
        </div>
        <span ref={room} className="relative z-10 rounded-xl ring-4 ring-card">
          <LogoMark className="size-10" />
        </span>
        <div className="relative z-10 text-sm">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="size-2 rounded-full bg-online" /> 3 online
          </div>
          <div className="text-xs text-muted-foreground">Ligaya, Miguel at Andrea</div>
        </div>
        {refs.map((r, i) => (
          <AnimatedBeam key={i} containerRef={container} fromRef={r} toRef={room} curvature={(i - 1) * -18} delay={i * 0.6} />
        ))}
      </div>
    </motion.div>
  );
}

export function AuthShowcase() {
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Shrink the preview to fit narrower panels (laptops) instead of cropping it.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / 910));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [count, setCount] = useState(reduce ? script.length : 1);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setCount((c) => (c >= script.length + 2 ? 1 : c + 1)), 2300);
    return () => clearInterval(id);
  }, [reduce]);

  const shown = script.slice(0, Math.min(count, script.length));
  const typing = count < script.length ? script[count] : null;
  const float = reduce ? undefined : { y: [0, -9, 0] };

  return (
    <div className="relative h-full overflow-hidden text-foreground">
      <div className="relative z-10 flex h-full flex-col justify-center p-12 xl:p-16">
        <div className="max-w-xl">
          <h2 className="font-display text-4xl leading-[1.05] font-bold text-balance xl:text-5xl">
            Mag-aral nang <span className="mark [--mark-color:#FFE45C]">sabay-sabay.</span>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-foreground/75 xl:text-lg">
            Chat, notes and presence in one live room. See changes the moment your group makes them.
          </p>
        </div>

        {/* stage */}
        <TiltCard max={3} className="mt-12">
        <div ref={stageRef} className="relative flex-none" style={{ height: 540 * scale }}>
         <div className="absolute top-0 left-0 h-[540px] w-[900px]" style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <div style={{ perspective: 1800 }} className="absolute top-0 left-0 w-[860px] max-w-none">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 50, rotateY: -22 }}
              animate={{ opacity: 1, y: 0, rotateY: -9 }}
              transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ rotateX: 3, transformOrigin: "left center" }}
              className="glass overflow-hidden rounded-2xl text-foreground shadow-[0_50px_120px_-30px_rgba(8,12,40,.6)]"
            >
              {/* chrome */}
              <div className="flex items-center gap-3 border-b px-4 py-2.5">
                <div className="flex gap-1.5" aria-hidden>
                  <span className="size-2.5 rounded-full bg-border" />
                  <span className="size-2.5 rounded-full bg-border" />
                  <span className="size-2.5 rounded-full bg-border" />
                </div>
                <span className="rounded bg-[#FFE45C] px-1.5 py-0.5 font-mono text-[11px] font-medium">MATH 2210</span>
                <span className="text-sm font-medium">Finals barkada: Linear Algebra</span>
                <div className="ml-auto flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {Object.values(people).map((p) => (
                      <span key={p.name} className="rounded-full ring-2 ring-card">
                        <Initial name={p.name} color={p.color} size={24} />
                      </span>
                    ))}
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-[#FFECEE] px-2 py-0.5 text-[10px] font-bold text-[#D92D4A]">
                    <motion.span className="size-1.5 rounded-full bg-[#E5484D]" animate={reduce ? undefined : { opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
                    LIVE
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-[1.35fr_1fr]">
                {/* notes */}
                <div className="relative min-h-[390px] border-r bg-white p-6 text-[#101A33]">
                  <Cursor name="Miguel" color={people.miguel.color} path={{ left: ["18%", "55%", "40%"], top: ["62%", "68%", "80%"] }} duration={8} />
                  <Cursor name="Ligaya" color={people.ligaya.color} path={{ left: ["64%", "30%", "72%"], top: ["34%", "42%", "30%"] }} duration={10} delay={1} />
                  <h3 className="font-display text-2xl font-bold">Eigenvalues: exam review</h3>
                  <p className="mt-3 text-[15px] leading-7">
                    An eigenvector keeps its direction under <i>A</i>. The eigenvalue says <span className="mark mark-animate [animation-delay:0.8s]">how much it stretches</span>.
                  </p>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-7">
                    <li>
                      <code className="rounded bg-[#EDF0F8] px-1.5 py-0.5 font-mono text-[13px]">det(A − λI) = 0</code> gives every eigenvalue
                    </li>
                    <li>
                      Symmetric matrices have <span className="mark mark-animate [--mark-color:var(--mark-mint)] [animation-delay:1.8s]">real eigenvalues only</span>
                    </li>
                    <li>
                      Diagonalizable if there are <span className="mark mark-animate [--mark-color:var(--mark-pink)] [animation-delay:2.8s]">n independent eigenvectors</span>
                    </li>
                  </ul>
                  <p className="absolute bottom-4 left-6 flex items-center gap-2 text-xs text-[#5B6683]">
                    <span className="size-2 rounded-full bg-[#1FA971]" aria-hidden /> Miguel is editing this note
                  </p>
                </div>

                {/* chat */}
                <div className="flex min-h-[390px] flex-col justify-end gap-3 bg-background/40 p-4">
                  <AnimatePresence initial={false} mode="popLayout">
                    {shown.map((m) => {
                      const p = people[m.who];
                      return (
                        <motion.div key={m.text} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="flex gap-2">
                          <Initial name={p.name} color={p.color} size={26} />
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold">{p.name}</div>
                            <p className="text-[13px] leading-snug text-foreground/85">{m.text}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <div className="h-4 text-[11px] text-muted-foreground">{typing ? `${people[typing.who].name} is typing…` : ""}</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* floating cards */}
          <PresenceCard float={float} />

          <motion.div
            className="absolute top-[404px] right-2 z-20 flex items-center gap-2.5 rounded-xl bg-[#101A33] px-4 py-3 text-sm font-medium text-white shadow-2xl ring-1 ring-white/15"
            animate={reduce ? undefined : { y: [0, 8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-[#1FA971]">
              <Check className="size-3" strokeWidth={3} />
            </span>
            Version restored
          </motion.div>

          <motion.div
            className="absolute top-[-14px] right-10 z-20 flex items-center gap-2 rounded-xl bg-[#FFF6C2] px-3.5 py-2 text-xs font-medium text-[#101A33] shadow-xl ring-1 ring-[#F1D95A]"
            animate={reduce ? undefined : { y: [0, -7, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          >
            <Lock className="size-3.5" />
            Miguel is editing this note
          </motion.div>
         </div>
        </div>
        </TiltCard>
      </div>
    </div>
  );
}
