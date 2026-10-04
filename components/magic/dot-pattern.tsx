import { useId } from "react";
import { cn } from "@/lib/utils";

export function DotPattern({ width = 20, height = 20, r = 1, className }: { width?: number; height?: number; r?: number; className?: string }) {
  const id = useId();
  return (
    <svg aria-hidden className={cn("pointer-events-none absolute inset-0 size-full fill-foreground/15", className)}>
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={0} y={0}>
          <circle cx={r + 1} cy={r + 1} r={r} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
    </svg>
  );
}
