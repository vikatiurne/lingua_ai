import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { DoodlePattern } from "@/components/auth/doodle-pattern";

export default function Home() {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-gradient-to-br from-background via-background to-accent/40">
      <DoodlePattern id="doodles-landing" className="text-foreground opacity-[0.06]" />
      <Header />
      <main className="relative flex flex-1 flex-col items-center justify-center gap-10">
        <Hero />
        <Features />
      </main>
    </div>
  );
}