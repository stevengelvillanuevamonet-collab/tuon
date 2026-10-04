import Link from "next/link";
import { Bento } from "@/components/landing/bento";
import { HeroDemo } from "@/components/landing/hero-demo";
import { Logo } from "@/components/brand/logo";
import { DotPattern } from "@/components/magic/dot-pattern";
import { BorderBeam } from "@/components/magic/border-beam";
import { ShimmerButton } from "@/components/magic/shimmer-button";
import { Spotlight } from "@/components/magic/spotlight";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { getSession } from "@/lib/data";
import { getSupabaseEnv } from "@/lib/supabase/env";

async function signedIn() {
  if (!getSupabaseEnv()) return false;
  try {
    return Boolean(await getSession());
  } catch {
    return false;
  }
}

export default async function Home() {
  const authed = await signedIn();

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" aria-label="Tuon home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          {authed ? (
            <Button asChild>
              <Link href="/rooms">Open your rooms</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Create a room</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="relative">
          <DotPattern className="[mask-image:radial-gradient(70%_60%_at_50%_0%,#000,transparent)]" />
          <Spotlight className="-top-40 left-0 md:-top-20 md:left-40" />
          <div className="relative z-10 mx-auto max-w-6xl px-5 pt-14 pb-20 md:pt-20">
            <h1 className="max-w-4xl text-[2.75rem] leading-[1.02] font-bold text-balance sm:text-6xl md:text-7xl">
              A study room for everything you're learning.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Chat with your group, write notes together in markdown, and see who&apos;s working on what, live. Use it for a class, a certification, a side project, or just on your own.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ShimmerButton as={Link} href={authed ? "/rooms" : "/signup"}>
                Create a room
              </ShimmerButton>
              <Button asChild variant="outline" size="lg">
                <Link href={authed ? "/rooms" : "/login"}>I have an invite code</Link>
              </Button>
            </div>

            <div className="mt-14">
              <HeroDemo />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-24">
          <h2 className="max-w-2xl text-3xl leading-tight font-bold text-balance sm:text-4xl">
            Everything a study group needs, in one window.
          </h2>
          <div className="mt-10">
            <Bento />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="relative overflow-hidden rounded-[28px] border bg-foreground px-8 py-14 text-background sm:px-14">
            <BorderBeam size={160} duration={10} colorFrom="#ffe45c" colorTo="#7b8cff" />
            <h2 className="max-w-xl text-3xl leading-tight font-bold text-balance sm:text-4xl">Start a room for what you're learning next.</h2>
            <p className="mt-3 max-w-md text-background/70">Name your room, share the invite link, and your group is in the same notes within seconds.</p>
            <div className="mt-8">
              <ShimmerButton as={Link} href={authed ? "/rooms" : "/signup"} background="var(--primary)" shimmerColor="#ffffff" className="text-white">
                Create a room
              </ShimmerButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center px-5 py-6">
          <Logo className="text-base" />
        </div>
      </footer>
    </div>
  );
}
