"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { createRoom } from "@/lib/actions/rooms";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function CreateRoomDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [state, action, pending] = useActionState(createRoom, undefined);
  const [priv, setPriv] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a room</DialogTitle>
          <DialogDescription>For a class, an exam, a certification, a project, or just yourself. A topic label is optional and groups related rooms in your sidebar.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="roomName">Room name</Label>
            <Input id="roomName" name="name" placeholder="Finals barkada" required maxLength={80} />
          </div>
          <div className="grid grid-cols-[8.5rem_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="topicLabel">
                Label <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input id="topicLabel" name="topicLabel" placeholder="IELTS" maxLength={20} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topicName">
                Topic <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input id="topicName" name="topicName" placeholder="Reading and writing prep" maxLength={100} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="description" name="description" placeholder="What are you working on together?" maxLength={280} rows={2} />
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-card/60 p-3 text-sm">
            <span>
              <span className="font-medium">Invite only</span>
              <span className="block text-muted-foreground">Hidden from discovery. People join with your invite link.</span>
            </span>
            <Switch name="isPrivate" checked={priv} onCheckedChange={setPriv} aria-label="Invite only" />
          </label>
          {state?.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Create room
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
