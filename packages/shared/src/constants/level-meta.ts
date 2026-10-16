import { CEFR_LEVEL, type CEFRLevel } from "../enums/cefr-level";

export type LevelMeta = {
  code: CEFRLevel;
  name: string;
  description: string;
  order: number;
};

export const LEVEL_META: Record<CEFRLevel, LevelMeta> = {
  [CEFR_LEVEL.A1]: {
    code: CEFR_LEVEL.A1,
    name: "Beginner",
    description: "Basic phrases and simple conversations.",
    order: 1,
  },
  [CEFR_LEVEL.A2]: {
    code: CEFR_LEVEL.A2,
    name: "Elementary",
    description: "Everyday situations and simple exchanges.",
    order: 2,
  },
  [CEFR_LEVEL.A2_PLUS]: {
    code: CEFR_LEVEL.A2_PLUS,
    name: "Strong Waystage",
    description: "Bridge to B1, more fluent everyday speech.",
    order: 3,
  },
  [CEFR_LEVEL.B1]: {
    code: CEFR_LEVEL.B1,
    name: "Intermediate",
    description: "Familiar topics, travel, work, opinions.",
    order: 4,
  },
  [CEFR_LEVEL.B1_PLUS]: {
    code: CEFR_LEVEL.B1_PLUS,
    name: "Bridge to B2",
    description: "Complex tenses, causatives, mixed conditionals.",
    order: 5,
  },
  [CEFR_LEVEL.B2]: {
    code: CEFR_LEVEL.B2,
    name: "Upper-Intermediate",
    description: "Abstract topics, inversion, advanced passives.",
    order: 6,
  },
  [CEFR_LEVEL.C1]: {
    code: CEFR_LEVEL.C1,
    name: "Advanced",
    description: "Fluent, flexible, effective for social and academic use.",
    order: 7,
  },
  [CEFR_LEVEL.C2]: {
    code: CEFR_LEVEL.C2,
    name: "Proficiency",
    description: "Near-native, literary and stylistic mastery.",
    order: 8,
  },
};
