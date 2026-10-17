import { CEFR_LEVEL_LABELS, type CEFRLevel } from "@lingua/shared";

export function LevelBadge({ level }: { level: CEFRLevel }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm">
      <span className="font-display text-2xl font-semibold leading-none text-primary">
        {level}
      </span>
      <span className="text-sm text-muted-foreground">
        {CEFR_LEVEL_LABELS[level]}
      </span>
    </div>
  );
}
