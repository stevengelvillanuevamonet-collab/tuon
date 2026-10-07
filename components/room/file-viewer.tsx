"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, ExternalLink, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { FILE_BUCKET, fileKind, formatBytes } from "@/lib/files";
import type { RoomFile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PdfViewer } from "./pdf-viewer";
import { PptxViewer } from "./pptx-viewer";

/**
 * Opens one file from the room. PDFs and .pptx decks are drawn right here.
 * Legacy .ppt files (and any deck we can't draw) fall back to Microsoft's online viewer, which needs the app to be on a public https address.
 */
export function FileViewer({ file, onClose }: { file: RoomFile; onClose: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const kind = fileKind(file.name);
  const boxRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ArrayBuffer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [office, setOffice] = useState(kind === "ppt");
  const [officeUrl, setOfficeUrl] = useState<string | null>(null);
  const [full, setFull] = useState(false);

  // download the bytes (RLS decides whether this user may read the file)
  useEffect(() => {
    if (kind === "ppt") return;
    let cancelled = false;
    setData(null);
    setLoadError(null);
    supabase.storage
      .from(FILE_BUCKET)
      .download(file.storage_path)
      .then(async ({ data: blob, error }) => {
        if (cancelled) return;
        if (error || !blob) return setLoadError("Couldn't load this file. It may have been removed.");
        setData(await blob.arrayBuffer());
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, file.storage_path, kind]);

  // Microsoft viewer link, only made when it's needed
  useEffect(() => {
    if (!office || officeUrl) return;
    supabase.storage
      .from(FILE_BUCKET)
      .createSignedUrl(file.storage_path, 60 * 60)
      .then(({ data: s }) => s?.signedUrl && setOfficeUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(s.signedUrl)}`));
  }, [office, officeUrl, supabase, file.storage_path]);

  useEffect(() => {
    const onChange = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function download() {
    const { data: s, error } = await supabase.storage.from(FILE_BUCKET).createSignedUrl(file.storage_path, 60, { download: file.name });
    if (error || !s) return void toast.error("Couldn't prepare the download.");
    const a = document.createElement("a");
    a.href = s.signedUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void boxRef.current?.requestFullscreen?.();
  }

  return (
    <div ref={boxRef} className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Back to files">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{file.name}</div>
          <div className="text-xs text-muted-foreground">{formatBytes(file.size_bytes)}</div>
        </div>
        {kind === "pptx" && (
          <Button variant="ghost" size="sm" onClick={() => setOffice((o) => !o)} className="hidden sm:inline-flex">
            <ExternalLink /> {office ? "Tuon viewer" : "Microsoft viewer"}
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" onClick={toggleFullscreen} aria-label={full ? "Exit full screen" : "Full screen"}>
          {full ? <Minimize2 /> : <Maximize2 />}
        </Button>
        <Button variant="outline" size="sm" onClick={download}>
          <Download /> <span className="hidden sm:inline">Download</span>
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        {office ? (
          officeUrl ? (
            <iframe title={file.name} src={officeUrl} className="size-full border-0" allowFullScreen />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Opening in Microsoft viewer
            </div>
          )
        ) : loadError ? (
          <p className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">{loadError}</p>
        ) : !data ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading file
          </div>
        ) : kind === "pdf" ? (
          <PdfViewer data={data} />
        ) : (
          <PptxViewer data={data} onFailed={() => setOffice(true)} />
        )}
      </div>
    </div>
  );
}
