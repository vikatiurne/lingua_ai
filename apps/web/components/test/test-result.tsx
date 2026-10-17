import { AlertCircle, BookOpen } from "lucide-react";
import { CEFR_LEVELS, CEFR_LEVEL_LABELS, type CEFRLevel } from "@lingua/shared";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLevelCode } from "@/lib/level";
import type { WeakTopic } from "@/lib/test/gap-map";
import { pluralize } from "@/lib/i18n/plural";
import { cn } from "@/lib/utils";

export type SubmitStatus = "idle" | "submitting" | "success" | "error";

export function TestResult({
  level,
  correctCount,
  totalCount,
  weakTopics = [],
  status = "idle",
}: {
  level: CEFRLevel;
  correctCount: number;
  totalCount: number;
  weakTopics?: WeakTopic[];
  status?: SubmitStatus;
}) {
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const levelLabel = CEFR_LEVEL_LABELS[level] || level;
  const currentLevelIndex = CEFR_LEVELS.indexOf(level);
  const sortedWeakTopics = [...weakTopics].sort(
    (a, b) => CEFR_LEVELS.indexOf(a.level) - CEFR_LEVELS.indexOf(b.level),
  );

  return (
    <Card className="w-full max-w-xl">
      <CardHeader className="space-y-4 text-center">
        <div className="space-y-2">
          <CardTitle className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {formatLevelCode(level)}
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
          <div className="space-y-4">
            {status === "success" ? (
              weakTopics.length > 0 ? (
                <div className="space-y-3 text-left">
                  <p className="text-sm font-medium">Слабкі місця:</p>
                  <ul className="space-y-3">
                    {sortedWeakTopics.map((weakTopic) => {
                      const levelIndex = CEFR_LEVELS.indexOf(weakTopic.level);
                      const isAhead = levelIndex > currentLevelIndex;
                      const isBelow = levelIndex < currentLevelIndex;
                      const Icon = isAhead ? BookOpen : AlertCircle;
                      const weakLevel = formatLevelCode(weakTopic.level);
                      const hint = isAhead
                        ? `Новий матеріал — вивчиш на ${weakLevel}`
                        : isBelow
                          ? `У тебе ${formatLevelCode(level)}, але ця тема з ${weakLevel} — підтягни`
                          : "Поточний рівень — варто повторити";

                      return (
                        <li
                          key={`${weakTopic.level}-${weakTopic.topic}`}
                          className="flex items-start gap-2.5"
                        >
                          <Icon
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0",
                              isAhead ? "text-muted-foreground" : "text-primary"
                            )}
                          />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  "flex min-w-0 items-center gap-2 text-sm",
                                  isAhead
                                    ? "text-muted-foreground"
                                    : "font-medium text-foreground"
                                )}
                              >
                                <span className="truncate">{weakTopic.topic}</span>
                                <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                                  {weakLevel}
                                </span>
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {weakTopic.errors}{" "}
                                {pluralize(
                                  weakTopic.errors,
                                  "помилка",
                                  "помилки",
                                  "помилок"
                                )}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {hint}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Гарний результат!</p>
              )
            ) : null}
            <Button asChild className="w-full sm:w-auto">
              <Link href="/dashboard">Почати навчання</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
