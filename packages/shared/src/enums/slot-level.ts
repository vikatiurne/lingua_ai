export const SLOT_LEVEL = {
  BASIC: "basic",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
} as const;

export type SlotLevel = (typeof SLOT_LEVEL)[keyof typeof SLOT_LEVEL];

export const SLOT_LEVELS = Object.values(SLOT_LEVEL) as SlotLevel[];

export const DEFAULT_SLOT_LEVEL: SlotLevel = SLOT_LEVEL.INTERMEDIATE;
