import { cn } from "@/lib/utils";

export function BentoGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid w-full auto-rows-[minmax(17rem,auto)] grid-cols-1 gap-4 md:grid-cols-6", className)}>{children}</div>;
}

/** A bento tile: visual on top, title and copy below. Hover lifts the visual, not the whole card. */
export function BentoCard({
  title,
  description,
  visual,
  className,
}: {
  title: string;
  description: string;
  visual: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("group relative flex flex-col overflow-hidden border bg-card", className)}>
      <div className="relative flex-1 overflow-hidden p-5 pb-0 transition-transform duration-500 ease-out group-hover:-translate-y-1">{visual}</div>
      <div className="relative p-5 pt-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
