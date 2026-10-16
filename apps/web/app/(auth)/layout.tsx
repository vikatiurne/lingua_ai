import { CalendarDays, Check, Printer, Sparkles } from "lucide-react";

import { DoodlePattern } from "@/components/auth/doodle-pattern";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";

const features = [
  { icon: Sparkles, text: "Адаптивний тест визначить ваш рівень A1–C2" },
  { icon: CalendarDays, text: "Персональний план: одна підтема щодня" },
  { icon: Printer, text: "PDF для друку — пишіть переклади від руки" },
  { icon: Check, text: "AI розбирає помилки й повертає їх у вправи" },
];

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[#1C1A18] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        <DoodlePattern id="doodles-brand" className="text-white opacity-[0.07]" />

        <p className="relative font-display text-lg font-semibold tracking-tight">
          Lingua AI
        </p>

        <div className="relative max-w-md space-y-6">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
            Англійська, що тримається в голові
          </h2>
          <p className="leading-relaxed text-white/70">
            AI-план, щоденні вправи та розбір помилок — усе, щоб нарешті
            заговорити впевнено.
          </p>
          <ul className="space-y-3.5">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Icon className="h-3.5 w-3.5 text-accent" />
                </span>
                <span className="text-white/85">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/50">A1 → C2 · за шкалою CEFR</p>
      </aside>

      <div className="relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-accent/40 p-4">
        <DoodlePattern id="doodles-form" className="text-foreground opacity-[0.06]" />

        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>

        <p className="relative z-10 mb-6 font-display text-lg font-semibold tracking-tight lg:hidden">
          Lingua AI
        </p>

        <Card className="relative z-10 w-full max-w-md animate-in fade-in-0 slide-in-from-bottom-4 duration-500 border-border/70 p-6 shadow-xl shadow-black/5 sm:p-8">
          {children}
        </Card>
      </div>
    </div>
  );
}
