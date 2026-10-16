export const CEFR_LEVEL = {
  A1: "A1",
  A2: "A2",
  A2_PLUS: "A2_PLUS",
  B1: "B1",
  B1_PLUS: "B1_PLUS",
  B2: "B2",
  C1: "C1",
  C2: "C2",
} as const;

export type CEFRLevel = (typeof CEFR_LEVEL)[keyof typeof CEFR_LEVEL];

export const CEFR_LEVELS = Object.values(CEFR_LEVEL) as CEFRLevel[];

export const CEFR_LEVEL_LABELS: Record<CEFRLevel, string> = {
  A1: "Початківець",
  A2: "Елементарний",
  A2_PLUS: "Просунутий елементарний",
  B1: "Середній",
  B1_PLUS: "Міст до B2",
  B2: "Вище середнього",
  C1: "Просунутий",
  C2: "Володіння на рівні носія",
};

export const CEFR_LEVEL_ORDER: Record<CEFRLevel, number> = {
  A1: 1,
  A2: 2,
  A2_PLUS: 3,
  B1: 4,
  B1_PLUS: 5,
  B2: 6,
  C1: 7,
  C2: 8,
};
