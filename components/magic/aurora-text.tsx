import { cn } from "@/lib/utils";

/** Magic UI-style aurora text: cobalt, violet, teal and highlighter yellow drift through the letters. */
export function AuroraText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "animate-aurora-text bg-[linear-gradient(90deg,var(--aurora-1),var(--aurora-2),var(--aurora-3),var(--aurora-4),var(--aurora-1))] bg-[length:300%_100%] bg-clip-text text-transparent",
        className,
      )}
    >
      {children}
    </span>
  );
}
