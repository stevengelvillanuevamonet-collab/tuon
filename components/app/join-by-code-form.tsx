"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { joinRoomByCode } from "@/lib/actions/rooms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function JoinByCodeForm() {
  const [state, action, pending] = useActionState(joinRoomByCode, undefined);
  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <Input name="code" placeholder="Invite code" aria-label="Invite code" className="w-44 font-mono" required />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Join
        </Button>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
