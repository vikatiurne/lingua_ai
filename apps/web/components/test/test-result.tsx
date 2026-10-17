import { CEFR_LEVEL_LABELS, type CEFRLevel } from "@lingua/shared";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type SubmitStatus = "idle" | "submitting" | "error";

export function TestResult({
  level,
  correctCount,
  totalCount,
  status = "idle",
}: {
  level: CEFRLevel;
  correctCount: number;
  totalCount: number;
  status?: SubmitStatus;
}) {
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const levelLabel = CEFR_LEVEL_LABELS[level] || level;

  return (
    <Card className="w-full max-w-xl">
      <CardHeader className="space-y-4 text-center">
        <div className="space-y-2">
          <CardTitle className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {level}
          </CardTitle>
          <CardDescription className="text-base">{levelLabel}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 text-center">
        <div className="space-y-1">
          <p className="text-2xl font-semibold">{score}%</p>
          <p className="text-sm text-muted-foreground">
            Правильних відповідей: {correctCount} з {totalCount}
          </p>
        </div>
        {status === "submitting" ? (
          <p className="text-sm text-muted-foreground" role="status">
            Зберігаємо результат...
          </p>
        ) : status === "error" ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive" role="alert">
              Не вдалося зберегти результат. Спробуйте ще раз пізніше.
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/dashboard">До дашборду</Link>
            </Button>
          </div>
        ) : (
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard">Почати навчання</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
