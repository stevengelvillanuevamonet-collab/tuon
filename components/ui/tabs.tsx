"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

/** The active tab gets a pill that glides to it. It follows Radix's own `data-state`, so it works controlled or not. */
function TabsList({ className, children, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [pill, setPill] = React.useState<{ x: number; w: number } | null>(null);

  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const active = list.querySelector<HTMLElement>("[data-state=active]");
      setPill(active ? { x: active.offsetLeft, w: active.offsetWidth } : null);
    };
    measure();
    const mo = new MutationObserver(measure);
    mo.observe(list, { attributes: true, attributeFilter: ["data-state"], subtree: true });
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => {
      mo.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <TabsPrimitive.List
      ref={listRef}
      className={cn("relative inline-flex h-9 items-center rounded-lg bg-muted p-1", className)}
      {...props}
    >
      {pill && (
        <span
          aria-hidden
          className="absolute top-1 bottom-1 left-0 rounded-md bg-card shadow-sm transition-[transform,width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
          style={{ width: pill.w, transform: `translateX(${pill.x}px)` }}
        />
      )}
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative z-10 inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:text-foreground [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("flex-1 outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
