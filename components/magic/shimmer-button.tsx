import * as React from "react";
import { cn } from "@/lib/utils";

/** Magic UI-style shimmer button. Renders its own element so it works as <a> via `as`. */
export function ShimmerButton({
  children,
  className,
  shimmerColor = "#ffe45c",
  background = "var(--foreground)",
  as: Comp = "button",
  ...props
}: React.ComponentProps<"button"> & {
  shimmerColor?: string;
  background?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  as?: React.ElementType<any>;
  href?: string;
}) {
  return (
    <Comp
      style={{ "--spread": "90deg", "--shimmer-color": shimmerColor, "--radius": "0.75rem", "--speed": "3s", "--cut": "0.08em", "--bg": background } as React.CSSProperties}
      className={cn(
        "group relative z-0 inline-flex h-11 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-[var(--radius)] border border-white/10 px-6 text-[15px] font-medium whitespace-nowrap text-background [background:var(--bg)] [transform:translateZ(0)] transition-transform duration-300 ease-in-out active:translate-y-px",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 -z-30 overflow-visible blur-[2px] [container-type:size]">
        <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]">
          <div className="absolute -inset-full w-auto rotate-0 animate-spin-around [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]" />
        </div>
      </div>
      {children}
      <div className="absolute inset-0 rounded-[var(--radius)] shadow-[inset_0_-8px_10px_#ffffff1f] transition-all duration-300 group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]" />
      <div className="absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]" />
    </Comp>
  );
}
