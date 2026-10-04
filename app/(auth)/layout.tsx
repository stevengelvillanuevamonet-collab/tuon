import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { DotPattern } from "@/components/magic/dot-pattern";
import { Spotlight } from "@/components/magic/spotlight";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-12">
        <Link href="/" aria-label="Tuon home" className="w-fit">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</div>
      </div>

      <aside className="relative hidden overflow-hidden bg-foreground text-background lg:block">
        <DotPattern className="fill-background/15 [mask-image:radial-gradient(80%_70%_at_50%_40%,#000,transparent)]" />
        <Spotlight className="-top-32 left-0" fill="#7b8cff" />
        <div className="relative z-10 flex h-full flex-col justify-center gap-6 p-16">
          <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-sm">
            <p className="font-display text-2xl leading-snug font-semibold">
              Tatlong araw na lang, exam na. <span className="mark">Kasama ang Chapter 7.</span> Nasa room ang notes, at nandoon din ang buong barkada.
            </p>
            <div className="mt-6 flex items-center gap-3 text-sm text-background/70">
              <span className="size-2 rounded-full bg-online" />
              Ligaya, Miguel at Andrea ay online
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
