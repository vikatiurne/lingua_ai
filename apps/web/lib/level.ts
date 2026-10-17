import type { CEFRLevel } from "@lingua/shared";

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
