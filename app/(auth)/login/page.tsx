import type { Metadata } from "next";
import { AuthForm } from "@/components/app/auth-form";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const notice =
    error === "config"
      ? "This site isn't connected to Supabase yet. Check the NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY settings, then redeploy."
      : error === "session"
        ? "We couldn't verify your session. Try signing in again."
        : error === "confirmation"
          ? "That confirmation link didn't work. Sign in, or sign up again to get a new one."
          : undefined;
  const dest = safeNext(next, "");
  return (
    <>
      <h1 className="text-3xl font-bold">Welcome back</h1>
      <p className="mt-2 mb-8 text-muted-foreground">Sign in to rejoin your study rooms.</p>
      <AuthForm mode="login" next={dest || undefined} notice={notice} />
    </>
  );
}
