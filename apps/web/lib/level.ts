import { CEFR_LEVELS, type CEFRLevel } from "@lingua/shared";

export function parseLevel(
  value: string | string[] | undefined,
): CEFRLevel | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  return CEFR_LEVELS.includes(raw as CEFRLevel) ? (raw as CEFRLevel) : null;
}

export const LEVEL_SHORT_LABELS: Record<CEFRLevel, string> = {
  A1: "A1",
  A2: "A2",
  A2_PLUS: "A2+",
  B1: "B1",
  B1_PLUS: "B1+",
  B2: "B2",
  C1: "C1",
  C2: "C2",
};

export function formatLevelCode(level: CEFRLevel): string {
  return LEVEL_SHORT_LABELS[level] ?? level;
}

export const LEVEL_BADGE_CLASSES: Record<CEFRLevel, string> = {
  A1: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  A2: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  A2_PLUS: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  B1: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  B1_PLUS:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  B2: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  C1: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  C2: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

export function levelBadgeClasses(level: CEFRLevel): string {
  return LEVEL_BADGE_CLASSES[level] ?? "bg-muted text-muted-foreground";
}
