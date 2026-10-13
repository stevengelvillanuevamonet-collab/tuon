"use client";

import { useRef } from "react";
import { Users } from "lucide-react";
import { AnimatedBeam } from "@/components/magic/animated-beam";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoMark } from "@/components/brand/logo";

const people = [
  { letter: "L", color: "#E5484D" },
  { letter: "M", color: "#12A594" },
  { letter: "A", color: "#8E4EC6" },
];

/** "See who's here": three people, one room. Light travels from each of them to the room. */
export function PresenceBeam() {
  const container = useRef<HTMLDivElement>(null);
  const a = useRef<HTMLSpanElement>(null);
  const b = useRef<HTMLSpanElement>(null);
  const c = useRef<HTMLSpanElement>(null);
  const room = useRef<HTMLSpanElement>(null);
  const refs = [a, b, c];

  return (
    <div className="space-y-3 rounded-xl border bg-background p-4">
      <div ref={container} className="relative flex items-center justify-between px-1 py-1">
        <div className="flex flex-col gap-3">
          {people.map((p, i) => (
            <span key={p.letter} ref={refs[i]} className="relative z-10">
              <Avatar className="size-9 ring-2 ring-background">
                <AvatarFallback style={{ background: p.color }}>{p.letter}</AvatarFallback>
              </Avatar>
              <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-online ring-2 ring-background" />
            </span>
          ))}
        </div>
        <span ref={room} className="relative z-10 mr-3 rounded-xl ring-4 ring-background">
          <LogoMark className="size-11" />
        </span>
        {refs.map((r, i) => (
          <AnimatedBeam key={i} containerRef={container} fromRef={r} toRef={room} curvature={(i - 1) * -26} delay={i * 0.6} />
        ))}
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="size-4" /> Jomar is editing “Week 4”
      </p>
    </div>
  );
}
