import Link from "next/link";
import { Bento } from "@/components/landing/bento";
import { HeroDemo } from "@/components/landing/hero-demo";
import { Logo } from "@/components/brand/logo";
import { AuroraText } from "@/components/magic/aurora-text";
import { BlurText } from "@/components/magic/blur-text";
import { BorderBeam } from "@/components/magic/border-beam";
import { ShimmerButton } from "@/components/magic/shimmer-button";
import { ShinyText } from "@/components/magic/shiny-text";
import { TiltCard } from "@/components/magic/tilt-card";
import { Button } from "@/components/ui/button";
import { BackgroundDock } from "@/components/app/background-dock";
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
          <div className="relative z-10 mx-auto max-w-6xl px-5 pt-14 pb-20 md:pt-20">
            <p className="glass mb-7 inline-flex items-center gap-2.5 rounded-full py-1.5 pr-4 pl-3 text-sm">
              <span className="size-2 rounded-full bg-[var(--mark-yellow)] ring-4 ring-[var(--mark-yellow)]/25" aria-hidden />
              <ShinyText>Every note now keeps its version history</ShinyText>
            </p>
            <h1 className="max-w-4xl text-[2.75rem] leading-[1.02] font-bold text-balance sm:text-6xl md:text-7xl">
              <BlurText text="A study room for everything you're learning." />
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/75">
              Chat with your group, write Word-style notes together, share PDFs and slides, and see who&apos;s working on what, live. Use it for a class, a certification, a side project, or just on your own.
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
              <TiltCard max={3.5}>
                <HeroDemo />
              </TiltCard>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-24">
          <h2 className="max-w-2xl text-3xl leading-tight font-bold text-balance sm:text-4xl">
            <AuroraText>Everything a study group needs, in one window.</AuroraText>
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

      <BackgroundDock />

      <footer className="border-t pb-24">
        <div className="mx-auto flex max-w-6xl items-center px-5 py-6">
          <Logo className="text-base" />
        </div>
      </footer>
    </div>
  );
}
