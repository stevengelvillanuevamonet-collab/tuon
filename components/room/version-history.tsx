"use client";

import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { listVersions } from "@/lib/actions/notes";
import type { NoteVersion } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

export function VersionHistory({ noteId, canRestore, onRestore }: { noteId: string; canRestore: boolean; onRestore: (v: NoteVersion) => void }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<NoteVersion[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setVersions(null);
    void listVersions(noteId).then(setVersions);
  }, [open, noteId]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Version history">
          <History />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Version history</SheetTitle>
          <SheetDescription>Checkpoints are saved as the note changes. Restoring one saves it as the newest version.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 p-5 pt-2">
            {versions === null && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading versions
              </p>
            )}
            {versions?.length === 0 && <p className="text-sm text-muted-foreground">No earlier versions yet. They appear after the first few minutes of editing.</p>}
            {versions?.map((v) => (
              <div key={v.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{v.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {timeAgo(v.created_at)} · {v.profiles?.display_name ?? "Unknown"}
                    </div>
                  </div>
                  {canRestore && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onRestore(v);
                        setOpen(false);
                      }}
                    >
                      Restore
                    </Button>
                  )}
                </div>
                <p className="mt-2 line-clamp-3 font-mono text-xs break-words whitespace-pre-wrap text-muted-foreground">{v.content_md.slice(0, 220) || "(empty)"}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
