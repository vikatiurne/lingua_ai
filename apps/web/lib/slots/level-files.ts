import { CEFR_LEVEL, type CEFRLevel } from "@lingua/shared";

export type LevelFileNames = {
  slots: string;
  nouns: string;
  templates: string;
};

export const LEVEL_FILES: Record<CEFRLevel, LevelFileNames> = {
  [CEFR_LEVEL.A1]: {
    slots: "slots_a1.json",
    nouns: "slots_nouns_a1.json",
    templates: "templates_a1.json",
  },
  [CEFR_LEVEL.A2]: {
    slots: "slots_a2.json",
    nouns: "slots_nouns_a2.json",
    templates: "templates_a2.json",
  },
  [CEFR_LEVEL.A2_PLUS]: {
    slots: "slots_a2_plus.json",
    nouns: "slots_nouns_a2_plus.json",
    templates: "templates_a2_plus.json",
  },
  [CEFR_LEVEL.B1]: {
    slots: "slots_b1.json",
    nouns: "slots_nouns_b1.json",
    templates: "templates_b1_advanced.json",
  },
  [CEFR_LEVEL.B1_PLUS]: {
    slots: "slots_b1_plus.json",
    nouns: "slots_nouns_b1_plus.json",
    templates: "templates_b1_plus.json",
  },
  [CEFR_LEVEL.B2]: {
    slots: "slots_b2.json",
    nouns: "slots_nouns_b2.json",
    templates: "templates_b2.json",
  },
  [CEFR_LEVEL.C1]: {
    slots: "slots_c1.json",
    nouns: "slots_nouns_c1.json",
    templates: "templates_c1.json",
  },
  [CEFR_LEVEL.C2]: {
    slots: "slots_c2.json",
    nouns: "slots_nouns_c2.json",
    templates: "templates_c2.json",
  },
};

// Ensure all levels are mapped
for (const level of Object.values(CEFR_LEVEL)) {
  if (!LEVEL_FILES[level]) {
    throw new Error(`Missing file mapping for level: ${level}`);
  }
}
