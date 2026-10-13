import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the rooms dashboard so the page doesn't jump when it arrives.
export default function RoomsLoading() {
  return (
    <div className="h-full overflow-y-auto" aria-busy="true" aria-label="Loading your rooms">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="mt-3 h-4 w-56" />
        <Skeleton className="mt-10 h-5 w-28" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border bg-card/60 p-4">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="mt-4 h-6 w-3/4" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-6 h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
