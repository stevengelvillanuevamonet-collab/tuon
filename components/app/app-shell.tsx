"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Hash, Home, Menu, Plus, Search } from "lucide-react";
import type { MyRoom } from "@/lib/data";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandMenu } from "./command-menu";
import { CreateRoomDialog } from "./create-room-dialog";
import { UserMenu } from "./user-menu";

function SidebarBody({ rooms, profile, onCreate, onSearch }: { rooms: MyRoom[]; profile: Profile; onCreate: () => void; onSearch: () => void }) {
  const pathname = usePathname();

  const groups = useMemo(() => {
    const map = new Map<string, { code: string; name: string; items: MyRoom[] }>();
    for (const m of rooms) {
      const c = m.rooms.courses;
      const key = c?.id ?? "personal";
      const g = map.get(key) ?? { code: c?.code ?? "Personal", name: c?.name ?? "", items: [] };
      g.items.push(m);
      map.set(key, g);
    }
    // Topics A–Z, with un-labelled personal rooms last.
    return [...map.entries()].sort(([ka, a], [kb, b]) => (ka === "personal" ? 1 : kb === "personal" ? -1 : a.code.localeCompare(b.code))).map(([, g]) => g);
  }, [rooms]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-4 pb-3">
        <Link href="/rooms" aria-label="Tuon home">
          <Logo />
        </Link>
      </div>

      <div className="space-y-1 px-3">
        <button
          onClick={onSearch}
          className="flex h-9 w-full items-center gap-2 rounded-md border bg-card px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Search className="size-4" />
          Jump to…
          <kbd className="ml-auto rounded border bg-muted px-1.5 font-mono text-[10px]">⌘K</kbd>
        </button>
        <Link
          href="/rooms"
          className={cn("flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium hover:bg-accent", pathname === "/rooms" && "bg-accent")}
        >
          <Home className="size-4 text-muted-foreground" /> All rooms
        </Link>
      </div>

      <nav aria-label="Your rooms" className="thin-scroll mt-3 flex-1 overflow-y-auto px-3 pb-3">
        {groups.length === 0 && <p className="px-2.5 py-3 text-sm text-muted-foreground">You haven&apos;t joined a room yet.</p>}
        {groups.map((g) => (
          <div key={g.code} className="mb-3">
            <div className="flex items-baseline gap-2 px-2.5 py-1.5">
              <span className="font-mono text-xs font-semibold">{g.code}</span>
              <span className="truncate text-xs text-muted-foreground">{g.name}</span>
            </div>
            {g.items.map(({ rooms: r }) => {
              const active = pathname === `/rooms/${r.id}`;
              return (
                <Link
                  key={r.id}
                  href={`/rooms/${r.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex h-8 items-center gap-2 rounded-md px-2.5 text-sm hover:bg-accent", active && "bg-primary/10 font-medium text-primary hover:bg-primary/10")}
                >
                  <Hash className="size-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{r.name}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t p-3">
        <Button onClick={onCreate} className="w-full" variant="secondary">
          <Plus /> New room
        </Button>
        <UserMenu profile={profile} />
      </div>
    </div>
  );
}

export function AppShell({ rooms, profile, children }: { rooms: MyRoom[]; profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Close the mobile drawer after navigating.
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <TooltipProvider>
      <div className="flex h-dvh">
        <aside className="hidden w-64 shrink-0 border-r bg-card/60 md:block">
          <SidebarBody rooms={rooms} profile={profile} onCreate={() => setCreateOpen(true)} onSearch={() => setSearchOpen(true)} />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0" aria-describedby={undefined}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">Your study rooms</SheetDescription>
            <SidebarBody
              rooms={rooms}
              profile={profile}
              onCreate={() => {
                setMobileOpen(false);
                setCreateOpen(true);
              }}
              onSearch={() => {
                setMobileOpen(false);
                setSearchOpen(true);
              }}
            />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 items-center gap-2 border-b px-3 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu />
            </Button>
            <Logo className="text-lg" />
          </div>
          <main className="min-h-0 flex-1">{children}</main>
        </div>
      </div>

      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} rooms={rooms} onCreate={() => setCreateOpen(true)} />
      <CreateRoomDialog open={createOpen} onOpenChange={setCreateOpen} />
    </TooltipProvider>
  );
}
