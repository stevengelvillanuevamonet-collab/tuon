"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Hash, Plus } from "lucide-react";
import type { MyRoom } from "@/lib/data";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export function CommandMenu({
  open,
  onOpenChange,
  rooms,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rooms: MyRoom[];
  onCreate: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Jump to a room">
      <CommandInput placeholder="Jump to a room" />
      <CommandList>
        <CommandEmpty>No rooms match that search.</CommandEmpty>
        <CommandGroup heading="Your rooms">
          {rooms.map(({ rooms: r }) => (
            <CommandItem key={r.id} value={`${r.courses?.code ?? ""} ${r.courses?.name ?? ""} ${r.name}`} onSelect={() => go(() => router.push(`/rooms/${r.id}`))}>
              <Hash />
              <span className="truncate">{r.name}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">{r.courses?.code}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem value="create new room" onSelect={() => go(onCreate)}>
            <Plus /> Create a room
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
