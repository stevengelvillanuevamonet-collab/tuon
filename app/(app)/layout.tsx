import { AppShell } from "@/components/app/app-shell";
import { getMyRooms, requireSession } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireSession();
  const rooms = await getMyRooms(user.id);
  return (
    <AppShell rooms={rooms} profile={profile}>
      {children}
    </AppShell>
  );
}
