import { cn } from "@/lib/utils";

/** Magic UI-style shiny text: a slow sheen passes over the letters. Good for "new" notices. */
export function ShinyText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block animate-shine bg-[linear-gradient(110deg,var(--muted-foreground)_40%,var(--foreground)_50%,var(--muted-foreground)_60%)] bg-[length:200%_100%] bg-[position:100%_0] bg-clip-text bg-no-repeat text-transparent",
        className,
      )}
    >
      {children}
    </span>
  );
}
