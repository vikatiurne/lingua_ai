# 04 — Shared Package (Enums, Types, Constants)

**Епік:** E1 — Foundation
**Розмір:** M (2–3 год)
**Залежності:** 01
**Статус:** ✅ Done
**Гілка:** `feat/04-shared-package`

> ⚠️ **ЦЯ ЗАДАЧА НАПОВНЮЄ `packages/shared/`.**
> Пакет уже створений (задача 01). Тепер додаємо єнуми, типи, константи.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - `apps/web/**` (Next.js)
> - `apps/cms/**` (Strapi)
> - Prisma (задача 06)
> - Docker (задача 02)
>
> **Створюються тільки файли в `packages/shared/src/`.**

---

## 🎯 Мета

Після завершення задачі пакет `@lingua/shared` містить:
- Єнуми CEFR рівнів, типів помилок, статусів вправ, статусів recycling
- Спільні типи (Template, Slot, Exercise, Error)
- Константи (метадані рівнів, пороги recycling, лейбли українською)

Імпорт працює з `apps/web`:
```ts
import { CEFR_LEVEL, type CEFRLevel } from "@lingua/shared";
```

---

## 🔪 Вертикальний слайс

```
packages/shared/src/
    ├─→ enums/
    │    ├─→ cefr-level.ts
    │    ├─→ error-type.ts
    │    ├─→ error-recycling-status.ts   ← NEW
    │    ├─→ exercise-status.ts
    │    ├─→ progress-status.ts
    │    ├─→ slot-level.ts
    │    ├─→ material-type.ts
    │    └─→ locale.ts
    ├─→ types/
    │    ├─→ template.ts
    │    ├─→ slot.ts
    │    ├─→ exercise.ts
    │    └─→ error.ts
    ├─→ constants/
    │    ├─→ level-meta.ts
    │    └─→ error-recycling.ts          ← NEW
    └─→ index.ts
```

---

## ✅ Acceptance Criteria

- [ ] `enums/cefr-level.ts` — `CEFR_LEVEL` (as const) + тип + `CEFR_LEVELS` + `CEFR_LEVEL_LABELS` + `CEFR_LEVEL_ORDER`
- [ ] `enums/error-type.ts` — `ERROR_TYPE` (TOPIC, GENERAL) + labels
- [ ] `enums/error-recycling-status.ts` — `ERROR_RECYCLING_STATUS` (ACTIVE, ARCHIVED_SUCCESS, ARCHIVED_STUCK)
- [ ] `enums/exercise-status.ts` — `EXERCISE_STATUS` (GENERATED, IN_PROGRESS, EVALUATED, REVIEWED)
- [ ] `enums/progress-status.ts` — `PROGRESS_STATUS` (NOT_STARTED, IN_PROGRESS, MASTERED, NEEDS_REVIEW)
- [ ] `enums/slot-level.ts` — `SLOT_LEVEL` (basic, intermediate, advanced) + `DEFAULT_SLOT_LEVEL`
- [ ] `enums/material-type.ts` — `MATERIAL_TYPE` (podcast, film, article, series, book, video)
- [ ] `enums/locale.ts` — `LOCALE` (uk, en) + `DEFAULT_LOCALE`
- [ ] `types/slot.ts` — `SlotValue`, `SlotWithLevels`, `SlotReference`, `SlotEntry`, `SlotFile`, `SlotNounsFile`
- [ ] `types/template.ts` — `TemplatePattern`, `TemplateTopic`, `TemplateFile`, `ResolvedPattern`, `ResolvedTemplateTopic`
- [ ] `types/exercise.ts` — `SentenceDirection`, `ExerciseSentence`, `Exercise`
- [ ] `types/error.ts` — `UserError` з recycling-полями
- [ ] `constants/level-meta.ts` — `LEVEL_META`
- [ ] `constants/error-recycling.ts` — `ERROR_RECYCLING` (пороги 3/5)
- [ ] `index.ts` експортує все
- [ ] `pnpm typecheck` проходить без помилок
- [ ] Імпорт з `apps/web` працює
- [ ] `CEFR_LEVEL` значення: `A1`, `A2`, `A2_PLUS`, `B1`, `B1_PLUS`, `B2`, `C1`, `C2` (сумісно зі Strapi, задача 03)

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Prisma-типи (задача 06)
- ❌ Zod-схеми (задача 10+)
- ❌ API-клієнти (задача 10)
- ❌ Промпти для AI (задача 11)
- ❌ Бізнес-логіка
- ❌ i18n (задача 45)

---

## 📁 Файли, які треба створити

### `packages/shared/src/enums/`
- `cefr-level.ts`
- `error-type.ts`
- `error-recycling-status.ts`
- `exercise-status.ts`
- `progress-status.ts`
- `slot-level.ts`
- `material-type.ts`
- `locale.ts`

### `packages/shared/src/types/`
- `slot.ts`
- `template.ts`
- `exercise.ts`
- `error.ts`

### `packages/shared/src/constants/`
- `level-meta.ts`
- `error-recycling.ts`

### `packages/shared/src/`
- `index.ts` — оновити

---

## 🔧 Технічні деталі

### `enums/cefr-level.ts`

```ts
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
```

### `enums/error-type.ts`

```ts
export const ERROR_TYPE = {
  TOPIC: "topic",
  GENERAL: "general",
} as const;

export type ErrorType = (typeof ERROR_TYPE)[keyof typeof ERROR_TYPE];

export const ERROR_TYPE_VALUES = Object.values(ERROR_TYPE) as ErrorType[];

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  topic: "Помилка за темою",
  general: "Загальна граматична помилка",
};
```

### `enums/error-recycling-status.ts` ← NEW

```ts
export const ERROR_RECYCLING_STATUS = {
  ACTIVE: "active",
  ARCHIVED_SUCCESS: "archived_success",
  ARCHIVED_STUCK: "archived_stuck",
} as const;

export type ErrorRecyclingStatus =
  (typeof ERROR_RECYCLING_STATUS)[keyof typeof ERROR_RECYCLING_STATUS];

export const ERROR_RECYCLING_STATUS_VALUES = Object.values(
  ERROR_RECYCLING_STATUS
) as ErrorRecyclingStatus[];
```

### `enums/exercise-status.ts`

```ts
export const EXERCISE_STATUS = {
  GENERATED: "generated",
  IN_PROGRESS: "in_progress",
  EVALUATED: "evaluated",
  REVIEWED: "reviewed",
} as const;

export type ExerciseStatus =
  (typeof EXERCISE_STATUS)[keyof typeof EXERCISE_STATUS];

export const EXERCISE_STATUS_VALUES = Object.values(
  EXERCISE_STATUS
) as ExerciseStatus[];
```

### `enums/progress-status.ts`

```ts
export const PROGRESS_STATUS = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  MASTERED: "mastered",
  NEEDS_REVIEW: "needs_review",
} as const;

export type ProgressStatus =
  (typeof PROGRESS_STATUS)[keyof typeof PROGRESS_STATUS];

export const PROGRESS_STATUS_VALUES = Object.values(
  PROGRESS_STATUS
) as ProgressStatus[];
```

### `enums/slot-level.ts`

```ts
export const SLOT_LEVEL = {
  BASIC: "basic",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
} as const;

export type SlotLevel = (typeof SLOT_LEVEL)[keyof typeof SLOT_LEVEL];

export const SLOT_LEVELS = Object.values(SLOT_LEVEL) as SlotLevel[];

export const DEFAULT_SLOT_LEVEL: SlotLevel = SLOT_LEVEL.INTERMEDIATE;
```

### `enums/material-type.ts`

```ts
export const MATERIAL_TYPE = {
  PODCAST: "podcast",
  FILM: "film",
  ARTICLE: "article",
  SERIES: "series",
  BOOK: "book",
  VIDEO: "video",
} as const;

export type MaterialType = (typeof MATERIAL_TYPE)[keyof typeof MATERIAL_TYPE];

export const MATERIAL_TYPE_VALUES = Object.values(
  MATERIAL_TYPE
) as MaterialType[];
```

### `enums/locale.ts`

```ts
export const LOCALE = {
  UK: "uk",
  EN: "en",
} as const;

export type Locale = (typeof LOCALE)[keyof typeof LOCALE];

export const LOCALES = Object.values(LOCALE) as Locale[];

export const DEFAULT_LOCALE: Locale = LOCALE.UK;
```

### `types/slot.ts`

```ts
import type { SlotLevel } from "../enums/slot-level";

export type SlotValue = string[];

export type SlotWithLevels = {
  basic?: SlotValue;
  intermediate?: SlotValue;
  advanced?: SlotValue;
};

export type SlotReference = {
  $ref: string;
  level?: SlotLevel;
};

export type SlotEntry = SlotValue | SlotWithLevels | SlotReference;

export type SlotFile = {
  level: string;
  version: string;
  description?: string;
  usage?: string;
  slots: Record<string, unknown>;
};

export type SlotNounsFile = SlotFile;
```

### `types/template.ts`

```ts
import type { SlotEntry } from "./slot";

export type TemplateExample = string;

export type TemplatePattern = {
  id: string;
  pattern: string;
  generation_hint: string;
  slots: Record<string, SlotEntry>;
  examples: TemplateExample[];
};

export type TemplateSubtopic = {
  name: string;
  patterns: TemplatePattern[];
};

export type TemplateTopic = {
  topic: string;
  subtopics: TemplateSubtopic[];
};

export type TemplateFile = {
  level: string;
  version: string;
  slots_ref?: string | string[];
  generation_rules?: {
    min_words?: number;
    max_words?: number;
    avoid?: string[];
    require?: string[];
    default_slot_level?: string;
  };
  topics: TemplateTopic[];
};

export type ResolvedSlot = string[];

export type ResolvedPattern = Omit<TemplatePattern, "slots"> & {
  slots: Record<string, ResolvedSlot>;
};

export type ResolvedTemplateTopic = {
  topic: string;
  subtopics: {
    name: string;
    patterns: ResolvedPattern[];
  }[];
};
```

### `types/exercise.ts`

```ts
import type { CEFRLevel } from "../enums/cefr-level";
import type { ExerciseStatus } from "../enums/exercise-status";

export type SentenceDirection = "uk-en" | "en-uk";

export type ExerciseSentence = {
  id: string;
  source: string;
  direction: SentenceDirection;
  reference: string;
  userAnswer?: string;
  isCorrect?: boolean;
  errorId?: string;
};

export type Exercise = {
  id: string;
  userId: string;
  level: CEFRLevel;
  topic: string;
  subtopic?: string;
  templateIds: string[];
  sentences: ExerciseSentence[];
  topicScore?: number;
  grammarScore?: number;
  status: ExerciseStatus;
  createdAt: string;
  completedAt?: string;
};
```

### `types/error.ts`

```ts
import type { ErrorType } from "../enums/error-type";
import type { ErrorRecyclingStatus } from "../enums/error-recycling-status";

export type UserError = {
  id: string;
  userId: string;
  exerciseId: string;
  type: ErrorType;
  sentence: string;
  userAnswer: string;
  reference: string;
  explanation: string;
  category?: string;
  word?: string;
  translation?: string;

  // Recycling tracking
  timesRecycled: number;
  successCount: number;
  failureCount: number;
  status: ErrorRecyclingStatus;
  archivedAt?: string;

  createdAt: string;
  updatedAt: string;
};
```

### `constants/level-meta.ts`

```ts
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
```

### `constants/error-recycling.ts` ← NEW

```ts
export const ERROR_RECYCLING = {
  SUCCESS_THRESHOLD: 3,
  FAILURE_THRESHOLD: 5,
  RECYCLE_LIMIT: 5,
  STUCK_BANNER_THRESHOLD: 3,
} as const;

export type ErrorRecycling = typeof ERROR_RECYCLING;
```

### `index.ts` — оновити

```ts
// Enums
export * from "./enums/cefr-level";
export * from "./enums/error-type";
export * from "./enums/error-recycling-status";
export * from "./enums/exercise-status";
export * from "./enums/progress-status";
export * from "./enums/slot-level";
export * from "./enums/material-type";
export * from "./enums/locale";

// Types
export * from "./types/slot";
export * from "./types/template";
export * from "./types/exercise";
export * from "./types/error";

// Constants
export * from "./constants/level-meta";
export * from "./constants/error-recycling";
```

---

## 📝 README

**README не змінюється.** (Shared package — внутрішній пакет, не відображається у статусі проєкту.)

---

## 🧪 Як перевірити

```bash
# 1. Typecheck
pnpm typecheck
# Очікується: без помилок

# 2. Перевірити імпорт у apps/web
```

Тимчасово у `apps/web/app/page.tsx`:

```tsx
import {
  CEFR_LEVEL,
  CEFR_LEVELS,
  CEFR_LEVEL_LABELS,
  LEVEL_META,
  ERROR_RECYCLING,
} from "@lingua/shared";

export default function HomePage() {
  return (
    <main className="p-8">
      <h1>Lingua AI</h1>
      <ul>
        {CEFR_LEVELS.map((level) => (
          <li key={level}>
            {level} — {CEFR_LEVEL_LABELS[level]} (order: {LEVEL_META[level].order})
          </li>
        ))}
      </ul>
      <p>Recycle limit: {ERROR_RECYCLING.RECYCLE_LIMIT}</p>
    </main>
  );
}
```

```bash
# 3. Запустити
pnpm dev:web
# http://localhost:3001 → 8 рівнів + "Recycle limit: 5"
```

---

## ⚠️ Що може піти не так

| Проблема | Рішення |
|---|---|
| `Cannot find module '@lingua/shared'` | Перевір `exports` у `packages/shared/package.json` |
| TS не бачить нові файли | Перезапустити `pnpm typecheck` |
| `isolatedModules` помилка | Використовувати `export type` для типів |
| Значення `A2+` не приймається у Prisma | Нормально: у Prisma буде `A2_PLUS` (задача 06) |
| Duplicate export | Перевірити, що немає двох файлів з однаковими експортами |

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 9 (Рівні CEFR)
- `00_CONTEXT.md` → розділ 10 (Формат шаблонів і слотів)
- `AGENT_RULES.md` → розділ 7.2 (єнуми)

---

## 💬 Commit message

```
feat(shared): add enums, types and constants

- add CEFR_LEVEL, ERROR_TYPE, ERROR_RECYCLING_STATUS, EXERCISE_STATUS, PROGRESS_STATUS enums
- add SLOT_LEVEL, MATERIAL_TYPE, LOCALE enums
- add Slot, Template, Exercise, UserError types with recycling fields
- add LEVEL_META and ERROR_RECYCLING constants
- export all from package index
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/04-shared-package

# ... робота ...

git add .
git commit -m "feat(shared): add enums, types and constants"
git push origin feat/04-shared-package
```

---

## 📝 Нотатки

Заповнюється після завершення.

- Чи довелось використовувати `export type` замість `export`?
- Чи є проблеми з `isolatedModules`?
- Чи потрібно винести `LEVEL_META` у Strapi seed (задача 05)?