import { DoodlePattern } from "@/components/auth/doodle-pattern";
import { ThemeToggle } from "@/components/theme-toggle";

export default function FocusLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-accent/40">
      <DoodlePattern
        id="doodles-focus"
        className="text-foreground opacity-[0.06]"
      />
      <div className="fixed right-4 top-4 z-[60]">
        <ThemeToggle />
      </div>
      <main className="container mx-auto flex min-h-screen items-start justify-center px-4 pb-6 pt-16 sm:items-center sm:py-10">
        {children}
      </main>
    </div>
  );
}
