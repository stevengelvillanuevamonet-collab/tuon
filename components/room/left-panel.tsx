"use client";

import { useState } from "react";
import { FileText, Files } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilesPanel } from "./files-panel";
import { NotesPanel } from "./notes-panel";
import { useRoom } from "./room-provider";

/** Desktop left side: switch between the room's notes and its files. Both stay mounted so nothing resets. */
export function LeftPanel() {
  const { files } = useRoom();
  const [tab, setTab] = useState<"notes" | "files">("notes");

  const Tab = ({ id, icon, label, count }: { id: "notes" | "files"; icon: React.ReactNode; label: string; count?: number }) => (
    <button
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        tab === id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {count ? <span className="rounded-full bg-primary/15 px-1.5 text-[11px] font-semibold text-primary tabular-nums">{count}</span> : null}
    </button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" aria-label="Room content" className="flex items-center gap-1 border-b bg-card/40 px-3 py-1.5">
        <Tab id="notes" icon={<FileText className="size-4" />} label="Notes" />
        <Tab id="files" icon={<Files className="size-4" />} label="Files" count={files.length} />
      </div>
      <div className="min-h-0 flex-1">
        <div className={cn("h-full", tab !== "notes" && "hidden")}>
          <NotesPanel />
        </div>
        <div className={cn("h-full", tab !== "files" && "hidden")}>
          <FilesPanel />
        </div>
      </div>
    </div>
  );
}
