"use client";

import { FileText, MessageSquare } from "lucide-react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatPanel } from "./chat-panel";
import { NotesPanel } from "./notes-panel";
import { RoomHeader } from "./room-header";

export function Workspace() {
  const desktop = useMediaQuery("(min-width: 768px)", true);

  return (
    <div className="flex h-full flex-col">
      <RoomHeader />
      <div className="min-h-0 flex-1">
        {desktop ? (
          <ResizablePanelGroup direction="horizontal" autoSaveId="tuon-room-split">
            <ResizablePanel defaultSize={62} minSize={36}>
              <NotesPanel />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={38} minSize={24}>
              <ChatPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <Tabs defaultValue="notes" className="flex h-full flex-col">
            <TabsList className="mx-3 mt-2 shrink-0">
              <TabsTrigger value="notes">
                <FileText /> Notes
              </TabsTrigger>
              <TabsTrigger value="chat">
                <MessageSquare /> Chat
              </TabsTrigger>
            </TabsList>
            <TabsContent value="notes" className="mt-2 min-h-0 data-[state=inactive]:hidden">
              <NotesPanel />
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
