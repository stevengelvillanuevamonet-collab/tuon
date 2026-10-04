import type { Metadata } from "next";
import { AuthForm } from "@/components/app/auth-form";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const dest = safeNext(next, "");
  return (
    <>
      <h1 className="text-3xl font-bold">Create your account</h1>
      <p className="mt-2 mb-8 text-muted-foreground">One account for everything you study, with a group or on your own.</p>
      <AuthForm mode="signup" next={dest || undefined} />
    </>
  );
}
