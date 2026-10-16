import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <span className="font-display text-lg font-semibold tracking-tight">
          Lingua AI
        </span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild>
            <Link href="/login">Увійти</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
