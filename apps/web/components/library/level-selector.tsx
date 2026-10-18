"use client";

import { CEFR_LEVELS, CEFR_LEVEL_LABELS, type CEFRLevel } from "@lingua/shared";
import { useRouter } from "next/navigation";

import { formatLevelCode } from "@/lib/level";
import { cn } from "@/lib/utils";

export function LevelSelector({ current }: { current: CEFRLevel }) {
  const router = useRouter();

  return (
    <nav aria-label="Рівні CEFR" className="flex flex-wrap gap-2">
      {CEFR_LEVELS.map((level) => {
        const isActive = level === current;
        return (
          <button
            key={level}
            type="button"
            title={CEFR_LEVEL_LABELS[level]}
            aria-current={isActive ? "true" : undefined}
            onClick={() => router.push(`/library?level=${level}`)}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {formatLevelCode(level)}
          </button>
        );
      })}
    </nav>
  );
}
