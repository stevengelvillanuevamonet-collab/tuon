"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { joinPublicRoom } from "@/lib/actions/rooms";
import { Button } from "@/components/ui/button";

export function JoinRoomButton({ roomId, size = "sm" }: { roomId: string; size?: "sm" | "default" | "lg" }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size={size}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await joinPublicRoom(roomId);
          if (res?.error) toast.error(res.error);
        })
      }
    >
      {pending && <Loader2 className="animate-spin" />}
      Join room
    </Button>
  );
}
