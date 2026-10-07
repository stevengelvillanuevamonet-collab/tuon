"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Previous / page-number / next, shared by the PDF and PowerPoint viewers. */
export function PageControls({ page, count, onChange }: { page: number; count: number; onChange: (p: number) => void }) {
  const [draft, setDraft] = useState(String(page));
  useEffect(() => setDraft(String(page)), [page]);

  const commit = () => {
    const n = Math.round(Number(draft));
    if (Number.isFinite(n) && n >= 1 && n <= count) onChange(n);
    else setDraft(String(page));
  };

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Page navigation">
      <Button variant="ghost" size="icon-sm" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft />
      </Button>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          e.stopPropagation();
        }}
        inputMode="numeric"
        aria-label="Page number"
        className="h-8 w-11 rounded-md border bg-card text-center text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <span className="px-1 text-sm whitespace-nowrap text-muted-foreground tabular-nums">/ {count}</span>
      <Button variant="ghost" size="icon-sm" onClick={() => onChange(page + 1)} disabled={page >= count} aria-label="Next page">
        <ChevronRight />
      </Button>
    </div>
  );
}
