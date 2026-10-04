import { cn } from "@/lib/utils";

/**
 * Banter loader, adapted from Uiverse (Nawsome). Pure CSS: see globals.css.
 * `fill` centres it in whatever container it's placed in.
 */
export function Loader({ label = "Loading", fill = false, className }: { label?: string; fill?: boolean; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn(fill && "flex h-full min-h-64 w-full items-center justify-center", className)}>
      <div className="banter-loader" aria-hidden>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="banter-loader__box" />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
