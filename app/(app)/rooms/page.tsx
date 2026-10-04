import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { JoinByCodeForm } from "@/components/app/join-by-code-form";
import { JoinRoomButton } from "@/components/app/join-room-button";
import { Badge } from "@/components/ui/badge";
import { getMyRooms, requireSession } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Room } from "@/lib/types";

export const metadata: Metadata = { title: "Your rooms" };

export default async function RoomsPage() {
  const { user, profile } = await requireSession();
  const mine = await getMyRooms(user.id);
  const mineIds = new Set(mine.map((m) => m.rooms.id));

  const supabase = await createClient();
  const { data } = await supabase
    .from("rooms")
    .select("*, courses(*)")
    .eq("is_private", false)
    .order("created_at", { ascending: false })
    .limit(18);
  const discover = ((data ?? []) as Room[]).filter((r) => !mineIds.has(r.id)).slice(0, 6);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Hi {profile.display_name.split(" ")[0]}, where to?</h1>
            <p className="mt-1 text-muted-foreground">Pick up where your group left off.</p>
          </div>
          <JoinByCodeForm />
        </div>

        <section className="mt-10" aria-labelledby="mine">
          <h2 id="mine" className="text-lg font-semibold">
            Your rooms
          </h2>
          {mine.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed p-10 text-center">
              <p className="font-medium">No rooms yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Create a room for anything you're studying, or paste an invite code above to join your group.</p>
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map(({ rooms: r, role }) => (
                <li key={r.id}>
                  <Link href={`/rooms/${r.id}`} className="group flex h-full flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/50">
                    <div className="flex items-center justify-between">
                      {r.courses ? <Badge variant="course">{r.courses.code}</Badge> : <Badge variant="secondary">Personal</Badge>}
                      <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">{r.name}</h3>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{r.description || r.courses?.name || "Your own space for notes and chat"}</p>
                    <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-muted-foreground">
                      {r.is_private && (
                        <span className="inline-flex items-center gap-1">
                          <Lock className="size-3" /> Invite only
                        </span>
                      )}
                      <span className="capitalize">{role}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {discover.length > 0 && (
          <section className="mt-12" aria-labelledby="discover">
            <h2 id="discover" className="text-lg font-semibold">
              Open to join
            </h2>
            <ul className="mt-4 divide-y rounded-xl border bg-card">
              {discover.map((r) => (
                <li key={r.id} className="flex items-center gap-3 p-4">
                  {r.courses ? <Badge variant="course">{r.courses.code}</Badge> : <Badge variant="secondary">Open</Badge>}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.name}</div>
                    <div className="truncate text-sm text-muted-foreground">{r.courses?.name ?? r.description ?? ""}</div>
                  </div>
                  <JoinRoomButton roomId={r.id} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
