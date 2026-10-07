"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Hash, Home, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search } from "lucide-react";
import type { MyRoom } from "@/lib/data";
import { useLocalFlag } from "@/lib/hooks/use-local-setting";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CommandMenu } from "./command-menu";
import { CreateRoomDialog } from "./create-room-dialog";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

interface RoomGroup {
  code: string;
  name: string;
  items: MyRoom[];
}

function groupRooms(rooms: MyRoom[]): RoomGroup[] {
  const map = new Map<string, RoomGroup>();
  for (const m of rooms) {
    const c = m.rooms.courses;
    const key = c?.id ?? "personal";
    const g = map.get(key) ?? { code: c?.code ?? "Personal", name: c?.name ?? "", items: [] };
    g.items.push(m);
    map.set(key, g);
  }
  // Topics A–Z, with un-labelled personal rooms last.
  return [...map.entries()].sort(([ka, a], [kb, b]) => (ka === "personal" ? 1 : kb === "personal" ? -1 : a.code.localeCompare(b.code))).map(([, g]) => g);
}

/** One topic's rooms. Click the heading to fold the group away. */
function RoomGroupSection({ group, pathname }: { group: RoomGroup; pathname: string }) {
  return (
    <Collapsible defaultOpen className="mb-2">
      <CollapsibleTrigger className="group flex w-full items-baseline gap-2 rounded-md px-2.5 py-1.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
        <span className="font-mono text-xs font-semibold">{group.code}</span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{group.name}</span>
        <ChevronDown className="size-3.5 shrink-0 self-center text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {group.items.map(({ rooms: r }) => {
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
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Collapse / expand button. Must sit inside the sidebar's <Collapsible>. */
function CollapseToggle({ collapsed }: { collapsed: boolean }) {
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={label}>
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </CollapsibleTrigger>
      </TooltipTrigger>
      <TooltipContent side={collapsed ? "right" : "bottom"}>{label}</TooltipContent>
    </Tooltip>
  );
}

interface SidebarProps {
  rooms: MyRoom[];
  profile: Profile;
  onCreate: () => void;
  onSearch: () => void;
}

/** The slim, icon-only sidebar shown when it's collapsed. */
function SidebarRail({ rooms, profile, onCreate, onSearch }: SidebarProps) {
  const pathname = usePathname();
  const railButton =
    "flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div className="flex h-full flex-col items-center gap-1 py-3">
      <Link href="/rooms" aria-label="Tuon home" className="mb-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <LogoMark />
      </Link>
      <ThemeToggle />
      <CollapseToggle collapsed />

      <div className="my-1 h-px w-6 bg-border" />
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onSearch} className={railButton} aria-label="Jump to…">
            <Search className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Jump to… (⌘K)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/rooms" aria-label="All rooms" className={cn(railButton, pathname === "/rooms" && "bg-accent text-foreground")}>
            <Home className="size-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">All rooms</TooltipContent>
      </Tooltip>

      <nav aria-label="Your rooms" className="thin-scroll mt-1 flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto py-1">
        {rooms.map(({ rooms: r }) => {
          const active = pathname === `/rooms/${r.id}`;
          return (
            <Tooltip key={r.id}>
              <TooltipTrigger asChild>
                <Link
                  href={`/rooms/${r.id}`}
                  aria-label={r.name}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground",
                  )}
                >
                  {r.name.trim().slice(0, 2).toUpperCase() || "#"}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{r.name}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button onClick={onCreate} variant="secondary" size="icon" aria-label="New room">
            <Plus />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">New room</TooltipContent>
      </Tooltip>
      <UserMenu profile={profile} compact />
    </div>
  );
}

function SidebarBody({ rooms, profile, onCreate, onSearch, collapsible = false }: SidebarProps & { collapsible?: boolean }) {
  const pathname = usePathname();
  const groups = useMemo(() => groupRooms(rooms), [rooms]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 px-4 pt-4 pb-3">
        <Link href="/rooms" aria-label="Tuon home">
          <Logo />
        </Link>
        <ThemeToggle className="ml-1" />
        {collapsible && (
          <div className="ml-auto">
            <CollapseToggle collapsed={false} />
          </div>
        )}
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
          <RoomGroupSection key={g.code} group={g} pathname={pathname} />
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
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalFlag("tuon-sidebar-collapsed", false);

  // Close the mobile drawer after navigating.
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <TooltipProvider>
      <div className="flex h-dvh">
        <Collapsible
          open={!sidebarCollapsed}
          onOpenChange={(open) => setSidebarCollapsed(!open)}
          className={cn("hidden h-full shrink-0 border-r bg-card/60 transition-[width] duration-200 md:block", sidebarCollapsed ? "w-14" : "w-64")}
        >
          {sidebarCollapsed ? (
            <SidebarRail rooms={rooms} profile={profile} onCreate={() => setCreateOpen(true)} onSearch={() => setSearchOpen(true)} />
          ) : (
            <CollapsibleContent className="h-full">
              <SidebarBody collapsible rooms={rooms} profile={profile} onCreate={() => setCreateOpen(true)} onSearch={() => setSearchOpen(true)} />
            </CollapsibleContent>
          )}
        </Collapsible>

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
            <ThemeToggle />
          </div>
          <main className="min-h-0 flex-1">{children}</main>
        </div>
      </div>

      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} rooms={rooms} onCreate={() => setCreateOpen(true)} />
      <CreateRoomDialog open={createOpen} onOpenChange={setCreateOpen} />
    </TooltipProvider>
  );
}
