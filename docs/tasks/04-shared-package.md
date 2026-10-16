# 05 — Shared Package (Enums, Types, Constants)

**Епік:** E2 — Data & Shared
**Розмір:** M (2–3 год)
**Залежності:** 01
**Статус:** ⬜ Todo
**Гілка:** `feat/05-shared-package`

> ⚠️ **ЦЯ ЗАДАЧА НАПОВНЮЄ `packages/shared/`.**
> Пакет уже створений (задача 01). Тепер додаємо єнуми, типи, константи.
>
> ⚠️ **ЦЯ ЗАДАЧА НЕ ТОРКАЄТЬСЯ:**
> - `apps/web/**` (Next.js)
> - `apps/cms/**` (Strapi)
> - Prisma (задача 06)
> - Docker (задача 02)
>
> **Створюються тільки файли в `packages/shared/src/`.**

---

## 🎯 Мета

Після завершення задачі пакет `@lingua/shared` містить:
- Єнуми CEFR рівнів, типів помилок, статусів вправ
- Спільні типи (Template, Slot, Exercise, Error)
- Константи (метадані рівнів, лейбли українською)

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
    │    └─→ level-meta.ts
    └─→ index.ts
```

**Перевірка:** `import { CEFR_LEVEL } from "@lingua/shared"` у `apps/web` працює.

---

## ✅ Acceptance Criteria

- [ ] `packages/shared/src/enums/cefr-level.ts` — `CEFR_LEVEL` as const + тип + `CEFR_LEVELS` масив + `CEFR_LEVEL_LABELS`
- [ ] `packages/shared/src/enums/error-type.ts` — `ERROR_TYPE` (TOPIC, GENERAL)
- [ ] `packages/shared/src/enums/exercise-status.ts` — `EXERCISE_STATUS` (GENERATED, IN_PROGRESS, EVALUATED, REVIEWED)
- [ ] `packages/shared/src/enums/progress-status.ts` — `PROGRESS_STATUS` (NOT_STARTED, IN_PROGRESS, MASTERED, NEEDS_REVIEW)
- [ ] `packages/shared/src/enums/slot-level.ts` — `SLOT_LEVEL` (basic, intermediate, advanced)
- [ ] `packages/shared/src/enums/material-type.ts` — `MATERIAL_TYPE` (podcast, film, article, series, book, video)
- [ ] `packages/shared/src/enums/locale.ts` — `LOCALE` (uk, en)
- [ ] `packages/shared/src/types/*.ts` — Template, Slot, Exercise, Error
- [ ] `packages/shared/src/constants/level-meta.ts` — `LEVEL_META` з назвами, порядком, описами
- [ ] `packages/shared/src/index.ts` експортує все
- [ ] `pnpm typecheck` проходить без помилок
- [ ] Імпорт з `apps/web` працює
- [ ] Значення `CEFR_LEVEL` сумісні зі Strapi (задача 03): `A1`, `A2`, `A2+`, `B1`, `B1+`, `B2`, `C1`, `C2`
- [ ] packages/shared/src/constants/error-recycling.ts створено
- [ ] ERROR_RECYCLING експортується з @lingua/shared

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Prisma-типи (задача 06)
- ❌ Zod-схеми (задача 10+)
- ❌ API-клієнти (задача 10)
- ❌ Промпти для AI (задача 11)
- ❌ Бізнес-логіка (`getCalorieLevel`-подібна) — тільки якщо потрібно для валідації
- ❌ i18n (задача 45)

---

## 📁 Файли, які треба створити

### `packages/shared/src/enums/`

- `cefr-level.ts`
- `error-type.ts`
- `exercise-status.ts`
- `progress-status.ts`
- `slot-level.ts`
- `material-type.ts`
- `locale.ts`

### `packages/shared/src/types/`

- `template.ts`
- `slot.ts`
- `exercise.ts`
- `error.ts`

### `packages/shared/src/constants/`

- `level-meta.ts`

### `packages/shared/src/`

- `index.ts` — оновити

---

## 🔧 Технічні деталі

### `packages/shared/src/enums/cefr-level.ts`

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
  "A2_PLUS": 3,
  B1: 4,
  "B1_PLUS": 5,
  B2: 6,
  C1: 7,
  C2: 8,
};
```

### `packages/shared/src/enums/error-type.ts`

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

### `packages/shared/src/enums/exercise-status.ts`

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

### `packages/shared/src/enums/progress-status.ts`

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

### `packages/shared/src/enums/slot-level.ts`

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

### `packages/shared/src/enums/material-type.ts`

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

### `packages/shared/src/enums/locale.ts`

```ts
export const LOCALE = {
  UK: "uk",
  EN: "en",
} as const;

export type Locale = (typeof LOCALE)[keyof typeof LOCALE];

export const LOCALES = Object.values(LOCALE) as Locale[];

export const DEFAULT_LOCALE: Locale = LOCALE.UK;
```

### `packages/shared/src/types/slot.ts`

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
```

### `packages/shared/src/types/template.ts`

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
```

### `packages/shared/src/types/exercise.ts`

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

### `packages/shared/src/types/error.ts`

```ts
import type { ErrorType } from "../enums/error-type";

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
  createdAt: string;
};
```

### `packages/shared/src/constants/level-meta.ts`

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

### `packages/shared/src/index.ts` — оновити

```ts
// Enums
export * from "./enums/cefr-level";
export * from "./enums/error-type";
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
```

---

## 📝 README

Після завершення задачі — оновити `README.md`:
- [ ] Пункт «X» у «📊 Статус проєкту» → `[x]`
- [ ] (якщо UI) Додати скриншот в «📸 Скриншоти»
- [ ] (якщо deploy) Додати live URL в «🚀 Демо»

## 🧪 Як перевірити

```bash
# 1. Typecheck
pnpm typecheck
# Очікується: без помилок

# 2. Перевірити імпорт у apps/web
# Відкрити apps/web/app/page.tsx і тимчасово додати:
```

```tsx
import {
  CEFR_LEVEL,
  CEFR_LEVELS,
  CEFR_LEVEL_LABELS,
  LEVEL_META,
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
    </main>
  );
}
```

```bash
# 3. Запустити
pnpm dev:web
# http://localhost:3001 → має показати список 8 рівнів
```

---

## ⚠️ Що може піти не так

| Проблема | Рішення |
|---|---|
| `Cannot find module '@lingua/shared'` | Перевір `exports` у `packages/shared/package.json` |
| TS не бачить нові файли | Перезапустити `pnpm typecheck` |
| `isolatedModules` помилка | Використовувати `export type` для типів: `export type { ... }` |
| Значення `A2+` не приймається у Prisma | Це нормально: у Prisma буде `A2_PLUS` (задача 06), а в app-коді — `A2+` |
| Duplicate export | Перевірити, що немає двох файлів з однаковими експортами |

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 9 (Рівні CEFR)
- `00_CONTEXT.md` → розділ 10 (Формат шаблонів і слотів)
- `docs/tasks/03-strapi-content-types.md` (значення enum мають збігатись)
- `AGENT_RULES.md` → розділ 7.2 (єнуми)

---

## 💬 Commit message

```
feat(shared): add enums, types and constants

- add CEFR_LEVEL, ERROR_TYPE, EXERCISE_STATUS, PROGRESS_STATUS enums
- add SLOT_LEVEL, MATERIAL_TYPE, LOCALE enums
- add Slot, Template, Exercise, UserError types
- add LEVEL_META constants with Ukrainian labels
- export all from package index
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/05-shared-package

# ... робота ...

git add .
git commit -m "feat(shared): add enums, types and constants"
git push origin feat/05-shared-package
```

---

## 📝 Нотатки

Заповнюється після завершення.

- Чи довелось використовувати `export type` замість `export`?
- Чи є проблеми з `isolatedModules`?
- Чи потрібно винести `LEVEL_META` у Strapi seed (задача 04)?