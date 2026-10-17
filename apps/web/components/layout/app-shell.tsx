import { DoodlePattern } from "@/components/auth/doodle-pattern";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-accent/40">
      <DoodlePattern
        id="doodles-app"
        className="text-foreground opacity-[0.06]"
      />
      <div className="fixed right-4 top-4 z-[60]">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
