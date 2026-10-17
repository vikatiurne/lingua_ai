import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { UserMenu } from "@/components/dashboard/user-menu";

export function Header({ email }: { email: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur md:px-6">
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
