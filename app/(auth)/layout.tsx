import Link from "next/link";
import { AuthShowcase } from "@/components/app/auth-showcase";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-12">
        <Link href="/" aria-label="Tuon home" className="w-fit">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</div>
      </div>

      <aside className="hidden lg:block">
        <AuthShowcase />
      </aside>
    </div>
  );
}
