"use client";

import { useEffect, useRef } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { FileText, Files, MessageSquare, PanelRightOpen, VolumeX } from "lucide-react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useLocalFlag } from "@/lib/hooks/use-local-setting";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChatPanel } from "./chat-panel";
import { FilesPanel } from "./files-panel";
import { LeftPanel } from "./left-panel";
import { NotesPanel } from "./notes-panel";
import { RoomHeader } from "./room-header";
import { useRoom } from "./room-provider";

function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={className ?? "rounded-full bg-primary px-1.5 text-[11px] leading-[18px] font-semibold text-primary-foreground tabular-nums"} aria-label={`${count} unread`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** What's left of the chat when it's collapsed: a slim bar that reopens it and shows what you've missed. */
function ChatRail() {
  const { unread, chatMuted } = useRoom();
  return (
    <div className="flex w-11 shrink-0 flex-col items-center gap-2 border-l bg-card/60 py-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={unread ? `Open chat, ${unread} unread` : "Open chat"} className="relative">
              <PanelRightOpen />
              {unread > 0 && <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-primary ring-2 ring-card" />}
            </Button>
          </CollapsibleTrigger>
        </TooltipTrigger>
        <TooltipContent side="left">Open chat</TooltipContent>
      </Tooltip>
      <UnreadBadge count={unread} />
      <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
      {chatMuted && <VolumeX className="size-3.5 text-muted-foreground" aria-label="Sounds are muted" />}
      <span className="mt-1 text-xs font-medium text-muted-foreground [writing-mode:vertical-rl]">Chat</span>
    </div>
  );
}

export function Workspace() {
  const desktop = useMediaQuery("(min-width: 768px)", true);
  const { unread } = useRoom();
  const [chatCollapsed, setChatCollapsed] = useLocalFlag("tuon-chat-collapsed", false);
  const chatPanel = useRef<ImperativePanelHandle>(null);

  // keep the resizable panel in step with the collapse state (button, rail, or dragging it shut)
  useEffect(() => {
    const p = chatPanel.current;
    if (!p) return;
    if (chatCollapsed && !p.isCollapsed()) p.collapse();
    if (!chatCollapsed && p.isCollapsed()) p.expand();
  }, [chatCollapsed, desktop]);

  return (
    <div className="flex h-full flex-col">
      <RoomHeader />
      <div className="min-h-0 flex-1">
        {desktop ? (
          <Collapsible open={!chatCollapsed} onOpenChange={(open) => setChatCollapsed(!open)} className="flex h-full">
            <div className="min-w-0 flex-1">
              <ResizablePanelGroup direction="horizontal" autoSaveId="tuon-room-split-v2">
                <ResizablePanel defaultSize={62} minSize={36}>
                  <LeftPanel />
                </ResizablePanel>
                <ResizableHandle withHandle={!chatCollapsed} disabled={chatCollapsed} className={chatCollapsed ? "hidden" : undefined} />
                <ResizablePanel
                  ref={chatPanel}
                  defaultSize={38}
                  minSize={22}
                  collapsible
                  collapsedSize={0}
                  onCollapse={() => setChatCollapsed(true)}
                  onExpand={() => setChatCollapsed(false)}
                >
                  <CollapsibleContent forceMount className="h-full data-[state=closed]:hidden">
                    <ChatPanel collapsible visible={!chatCollapsed} />
                  </CollapsibleContent>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
            {chatCollapsed && <ChatRail />}
          </Collapsible>
        ) : (
          <Tabs defaultValue="notes" className="flex h-full flex-col">
            <TabsList className="mx-3 mt-2 shrink-0">
              <TabsTrigger value="notes">
                <FileText /> Notes
              </TabsTrigger>
              <TabsTrigger value="files">
                <Files /> Files
              </TabsTrigger>
              <TabsTrigger value="chat">
                <MessageSquare /> Chat
                <UnreadBadge count={unread} />
              </TabsTrigger>
            </TabsList>
            <TabsContent value="notes" className="mt-2 min-h-0 data-[state=inactive]:hidden">
              <NotesPanel />
            </TabsContent>
            <TabsContent value="files" className="mt-2 min-h-0 data-[state=inactive]:hidden">
              <FilesPanel />
            </TabsContent>
            <TabsContent value="chat" className="mt-2 min-h-0 data-[state=inactive]:hidden">
              <ChatPanel />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
