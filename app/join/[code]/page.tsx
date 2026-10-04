import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

// Invite links look like /join/ab12cd34ef. Middleware sends signed-out visitors to /login first.
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_room_by_code", { p_code: code });
  if (data) redirect(`/rooms/${data}`);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-6">
      <h1 className="text-3xl font-bold">This invite doesn&apos;t work</h1>
      <p className="text-muted-foreground">{error?.message ?? "The code may have been mistyped."} Ask the room owner for a fresh link.</p>
      <Button asChild>
        <Link href="/rooms">Go to your rooms</Link>
      </Button>
    </main>
  );
}
