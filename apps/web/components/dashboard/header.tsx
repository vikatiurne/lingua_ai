import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { UserMenu } from "@/components/dashboard/user-menu";

export function Header({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-border/70 px-4 md:px-6 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-background/95 before:content-[''] before:backdrop-blur supports-[backdrop-filter]:before:bg-background/60">
      <div className="flex items-center gap-2">
        <MobileNav />
        <Link
          href="/dashboard"
          className="font-display text-lg font-semibold tracking-tight"
        >
          Lingua AI
        </Link>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu email={email} />
      </div>
    </header>
  );
}
