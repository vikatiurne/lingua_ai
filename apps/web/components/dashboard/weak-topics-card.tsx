import { AlertCircle, BookOpen } from "lucide-react";

import { CEFR_LEVELS, type CEFRLevel } from "@lingua/shared";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLevelCode } from "@/lib/level";
import { cn } from "@/lib/utils";

export function WeakTopicsCard({
  topics,
  currentLevel,
}: {
  topics: { topicName: string; level: CEFRLevel }[];
  currentLevel: CEFRLevel;
}) {
  const currentLevelIndex = CEFR_LEVELS.indexOf(currentLevel);
  const sortedTopics = [...topics].sort(
    (a, b) => CEFR_LEVELS.indexOf(a.level) - CEFR_LEVELS.indexOf(b.level),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl font-semibold tracking-tight">
          Слабкі теми
        </CardTitle>
        <CardDescription>Теми, які варто повторити чи вивчити</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedTopics.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Слабких тем не виявлено — чудова робота!
          </p>
        ) : (
          <ul className="space-y-3">
            {sortedTopics.map((topic) => {
              const levelIndex = CEFR_LEVELS.indexOf(topic.level);
              const isAhead = levelIndex > currentLevelIndex;
              const isBelow = levelIndex < currentLevelIndex;
              const Icon = isAhead ? BookOpen : AlertCircle;
              const topicLevel = formatLevelCode(topic.level);
              const hint = isAhead
                ? `Новий матеріал — вивчиш на ${topicLevel}`
                : isBelow
                  ? `У тебе ${formatLevelCode(currentLevel)}, але ця тема з ${topicLevel} — підтягни`
                  : "Поточний рівень — варто повторити";

              return (
                <li
                  key={`${topic.level}-${topic.topicName}`}
                  className="flex items-start gap-2.5"
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      isAhead ? "text-muted-foreground" : "text-primary"
                    )}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className={cn(
                          "min-w-0 truncate",
                          isAhead
                            ? "text-muted-foreground"
                            : "font-medium text-foreground"
                        )}
                      >
                        {topic.topicName}
                      </span>
                      <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                        {topicLevel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
