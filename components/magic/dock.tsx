"use client";

import { createContext, useContext, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";

interface DockCtx {
  mouseX: MotionValue<number>;
  base: number;
  magnification: number;
  distance: number;
}
const Ctx = createContext<DockCtx | null>(null);

/** Magic UI-style floating dock: icons grow as the cursor passes over them. On touch it is a plain floating bar. */
export function Dock({
  children,
  className,
  base = 40,
  magnification = 1.45,
  distance = 110,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  base?: number;
  magnification?: number;
  distance?: number;
  label: string;
}) {
  const mouseX = useMotionValue(Infinity);
  const reduce = useReducedMotion();
  return (
    <Ctx.Provider value={{ mouseX, base, magnification: reduce ? 1 : magnification, distance }}>
      <div
        role="toolbar"
        aria-label={label}
        onPointerMove={(e) => e.pointerType === "mouse" && mouseX.set(e.clientX)}
        onPointerLeave={() => mouseX.set(Infinity)}
        className={cn("glass flex items-end gap-1 rounded-2xl p-1.5 shadow-lg", className)}
        style={{ height: base + 12 }}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function DockItem({ className, children, ...props }: React.ComponentProps<"button">) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("DockItem must be inside <Dock>");
  const ref = useRef<HTMLButtonElement>(null);
  const { mouseX, base, magnification, distance } = ctx;

  const offset = useTransform(mouseX, (x) => {
    const r = ref.current?.getBoundingClientRect();
    return r ? x - (r.left + r.width / 2) : Infinity;
  });
  const size = useSpring(useTransform(offset, [-distance, 0, distance], [base, base * magnification, base]), { mass: 0.1, stiffness: 160, damping: 14 });

  return (
    <motion.button
      ref={ref}
      type="button"
      style={{ width: size, height: size }}
      className={cn(
        "flex items-center justify-center rounded-xl text-foreground/80 outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-[46%] [&_svg]:shrink-0",
        className,
      )}
      {...(props as object)}
    >
      {children}
    </motion.button>
  );
}

export function DockSeparator() {
  return <span aria-hidden className="mx-1 h-7 w-px shrink-0 self-center bg-border" />;
}
