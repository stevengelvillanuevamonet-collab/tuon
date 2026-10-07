"use client";

import { useEffect, useRef } from "react";
import type { ImperativePanelGroupHandle } from "react-resizable-panels";
import { Columns2, FileText, Files, Rows2 } from "lucide-react";
import { useLocalSetting } from "@/lib/hooks/use-local-setting";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FilesPanel } from "./files-panel";
import { NotesPanel } from "./notes-panel";
import { useRoom } from "./room-provider";

type View = "notes" | "files" | "split";
type Orientation = "horizontal" | "vertical";

const LAYOUT: Record<View, (split: number) => [number, number]> = {
  notes: () => [100, 0],
  files: () => [0, 100],
  split: (n) => [n, 100 - n],
};

/**
 * Desktop left side: the room's notes, its files, or both at once (split screen) so you can read a PDF or slide deck
 * while you write. Notes and files stay mounted in every view, so switching never resets the document, your place in a
 * PDF, or the open file.
 */
export function LeftPanel() {
  const { files } = useRoom();
  const [view, setView] = useLocalSetting<View>("tuon-left-view", "notes");
  const [orientation, setOrientation] = useLocalSetting<Orientation>("tuon-split-orientation", "horizontal");
  const group = useRef<ImperativePanelGroupHandle>(null);
  const splitAt = useRef(50); // how the person last dragged the divider, restored when they split again

  useEffect(() => {
    group.current?.setLayout(LAYOUT[view](splitAt.current));
  }, [view, orientation]);

  const Seg = ({ id, icon, label, count }: { id: View; icon: React.ReactNode; label: string; count?: number }) => (
    <button
      role="tab"
      aria-selected={view === id}
      onClick={() => setView(id)}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        view === id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {count ? <span className="rounded-full bg-primary/15 px-1.5 text-[11px] font-semibold text-primary tabular-nums">{count}</span> : null}
    </button>
  );

  const split = view === "split";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b bg-card/40 px-3 py-1.5">
        <div role="tablist" aria-label="Room content" className="flex items-center gap-1">
          <Seg id="notes" icon={<FileText className="size-4" />} label="Notes" />
          <Seg id="files" icon={<Files className="size-4" />} label="Files" count={files.length} />
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          <Seg id="split" icon={<Columns2 className="size-4" />} label="Split view" />
        </div>
        {split && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto"
                aria-label={orientation === "horizontal" ? "Stack notes above files" : "Place notes and files side by side"}
                onClick={() => setOrientation(orientation === "horizontal" ? "vertical" : "horizontal")}
              >
                {orientation === "horizontal" ? <Rows2 /> : <Columns2 />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{orientation === "horizontal" ? "Stack top and bottom" : "Place side by side"}</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <ResizablePanelGroup ref={group} direction={orientation}>
          <ResizablePanel
            id="notes"
            order={1}
            defaultSize={100}
            minSize={25}
            collapsible
            collapsedSize={0}
            onResize={(size) => {
              if (split && size > 0 && size < 100) splitAt.current = size;
            }}
            onCollapse={() => split && setView("files")} // dragging a pane shut leaves just the other one
          >
            <NotesPanel />
          </ResizablePanel>
          <ResizableHandle withHandle={split} disabled={!split} className={cn(!split && "hidden")} />
          <ResizablePanel id="files" order={2} defaultSize={0} minSize={25} collapsible collapsedSize={0} onCollapse={() => split && setView("notes")}>
            <FilesPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
