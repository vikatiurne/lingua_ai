import { CEFR_LEVELS, type CEFRLevel } from "@lingua/shared";

import { LEVEL_SHORT_LABELS } from "@/lib/level";
import { cn } from "@/lib/utils";

export function LevelLadder({ currentLevel }: { currentLevel: CEFRLevel }) {
  const currentIndex = CEFR_LEVELS.indexOf(currentLevel);

  return (
    <ol
      className="flex items-end gap-1 sm:gap-1.5"
      aria-label="Поточний рівень за шкалою CEFR"
    >
      {CEFR_LEVELS.map((level, index) => {
        const isCurrent = index === currentIndex;
        const isPassed = index < currentIndex;

        return (
          <li key={level} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex h-8 w-full items-center justify-center rounded-md text-xs font-semibold transition-colors",
                isCurrent && "bg-primary text-primary-foreground shadow-sm",
                isPassed && "bg-primary/15 text-primary",
                !isCurrent && !isPassed && "bg-muted text-muted-foreground",
              )}
            >
              {LEVEL_SHORT_LABELS[level]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
