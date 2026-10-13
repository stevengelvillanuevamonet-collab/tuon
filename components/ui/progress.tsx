"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/** Pass `value` for a determinate bar. Leave it out for an indeterminate one (e.g. uploads that report no progress). */
function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const indeterminate = value == null;
  return (
    <ProgressPrimitive.Root value={value} className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-muted", className)} {...props}>
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-primary to-[var(--mark-yellow)]",
          indeterminate ? "w-1/2 animate-indeterminate" : "w-full transition-transform duration-500 ease-out",
        )}
        style={indeterminate ? undefined : { transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
