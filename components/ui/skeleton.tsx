import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-skeleton rounded-md bg-[linear-gradient(90deg,var(--muted)_25%,var(--accent)_50%,var(--muted)_75%)] bg-[length:300%_100%]", className)}
      {...props}
    />
  );
}

export { Skeleton };
