import { Skeleton } from "@/components/ui/skeleton";

// Mirrors a room: header, notes, and the chat column.
export default function RoomLoading() {
  return (
    <div className="flex h-full flex-col" aria-busy="true" aria-label="Opening your room">
      <div className="flex h-14 items-center gap-3 border-b px-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="ml-auto size-7 rounded-full" />
        <Skeleton className="size-7 rounded-full" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="hidden w-[38%] space-y-3 border-l p-4 md:block">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="ml-auto h-10 w-2/3" />
          <Skeleton className="h-10 w-4/5" />
        </div>
      </div>
    </div>
  );
}
