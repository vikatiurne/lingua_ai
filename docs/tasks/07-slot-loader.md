# 07 — Slot Loader

**Епік:** E2 — Data & Shared
**Розмір:** S (1–2 год)
**Залежності:** 02, 04
**Статус:** ✅ Done
**Гілка:** `feat/07-slot-loader`

> ⚠️ **ЦЯ ЗАДАЧА НЕ ТОРКАЄТЬСЯ:**
>
> - `data/**` — читаємо, не змінюємо
> - `apps/cms/**` (Strapi)
> - `$ref` resolver (задача 08)
> - AI-провайдери (задача 10)
> - Prisma (задача 06)
>
> **Створюється тільки модуль читання JSON-файлів.**

---

## 🎯 Мета

Після завершення задачі:

- Є функції `loadSlotFile`, `loadNounsFile`, `loadTemplateFile` — читають три типи JSON-файлів.
- Файли кешуються в пам'яті після першого читання.
- Є мапінг рівнів CEFR → імена файлів.
- Типи `SlotFile`, `SlotNounsFile` **імпортуються** з `@lingua/shared` (створені в задачі 04).

---

## 🔪 Вертикальний слайс

```
loadTemplateFile("B1")
    ├─→ визначає ім'я файлу через LEVEL_FILES
    ├─→ читає data/templates_b1_advanced.json
    ├─→ парсить JSON
    └─→ кешує в пам'яті
```

---

## ✅ Acceptance Criteria

- [x] Є `apps/web/lib/slots/level-files.ts` — мапінг `CEFRLevel → { slots, nouns, templates }`
- [x] Є `apps/web/lib/slots/loader.ts` — три функції + `clearSlotCache`
- [x] Є `apps/web/lib/slots/loader.test.ts` — 6+ тестів
- [x] Типи `SlotFile`, `SlotNounsFile` імпортуються з `@lingua/shared` (створені в задачі 04)
- [x] Шлях до `data/` через `import.meta.url` з fallback на `process.env.DATA_DIR`
- [x] Кеш працює: другий виклик повертає ту саму референцію (`toBe`)
- [x] Всі 8 рівнів завантажуються без помилок
- [x] `pnpm typecheck` і `pnpm --filter web test` проходять
- [x] `DATA_DIR=` додано в `.env.example`

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Розкриття `$ref` (задача 08)
- ❌ Zod-валідація JSON
- ❌ Watch mode
- ❌ Кеш у Redis (задача 13)
- ❌ Fetch зі Strapi (тільки fs)
- ❌ Створення типів `SlotFile`, `SlotNounsFile` — вони вже в `@lingua/shared`

---

## 📁 Файли

### Створити

- `apps/web/lib/slots/level-files.ts`
- `apps/web/lib/slots/loader.ts`
- `apps/web/lib/slots/loader.test.ts`
- `apps/web/vitest.config.ts` (якщо знадобиться для налаштування root)

### Змінити

- `apps/web/package.json` — додати `vitest` (devDep) + скрипти `test`, `test:watch`
- `.env.example` (корінь) — додати `DATA_DIR=`

### Не чіпати

- `data/**`
- `packages/shared/**` — тільки імпорт
- `apps/cms/**`
- Prisma

---

## 🔧 Інтерфейси (обов'язково)

### Типи (імпортуються з `@lingua/shared`)

```ts
import type {
  CEFRLevel,
  SlotFile,
  SlotNounsFile,
  TemplateFile,
} from "@lingua/shared";
import { CEFR_LEVEL } from "@lingua/shared";
```

**НЕ створювати ці типи повторно.** Вони вже в `packages/shared/src/types/slot.ts` і `template.ts` (задача 04).

### Функції в `loader.ts`

```ts
export function loadSlotFile(level: CEFRLevel): Promise<SlotFile>;
export function loadNounsFile(level: CEFRLevel): Promise<SlotNounsFile>;
export function loadTemplateFile(level: CEFRLevel): Promise<TemplateFile>;
export function clearSlotCache(): void;
```

### Мапінг у `level-files.ts`

```ts
export type LevelFileNames = {
  slots: string;
  nouns: string;
  templates: string;
};

export const LEVEL_FILES: Record<CEFRLevel, LevelFileNames>;
```

**Важливо:** для `B1` файл шаблонів називається `templates_b1_advanced.json` (історична назва).

---

## 🧠 Алгоритм (словами)

**Шлях до `data/`:**

```ts
const DATA_DIR =
  process.env.DATA_DIR ?? new URL("../../../data/", import.meta.url).pathname;
```

**Чому так:**

- `process.cwd()` у Vitest, CI, `pnpm dev:web` — різний. Ненадійно.
- `import.meta.url` завжди вказує на **поточний файл** (`apps/web/lib/slots/loader.ts`).
- `new URL("../../../data/", import.meta.url)` → `<root>/data/`.
- Env `DATA_DIR` дозволяє перевизначити (для тестів або нестандартного розташування).

**`loadSlotFile(level)`:**

1. Якщо в кеші є — повернути.
2. Взяти ім'я файлу з `LEVEL_FILES[level].slots`.
3. `path.join(DATA_DIR, filename)`.
4. `fs.readFile` → `JSON.parse`.
5. Покласти в кеш.
6. Повернути.

**`loadNounsFile`, `loadTemplateFile`** — те саме, але зі своїми полями мапінгу.

**`clearSlotCache()`** — очистити всі три `Map`.

**При імпорті модуля:**

```ts
// Перевірити, що LEVEL_FILES має всі 8 рівнів
for (const level of Object.values(CEFR_LEVEL)) {
  if (!LEVEL_FILES[level]) {
    throw new Error(`Missing file mapping for level: ${level}`);
  }
}
```

---

## 🔬 Приклади входу/виходу

```ts
loadTemplateFile(CEFR_LEVEL.A1)
→ { level: "A1", version: "3.0", topics: [...], generation_rules: {...} }

loadSlotFile(CEFR_LEVEL.B1)
→ { level: "B1", slots: { present_simple: {...}, ... } }

loadTemplateFile(CEFR_LEVEL.B2) === loadTemplateFile(CEFR_LEVEL.B2)
→ true (та сама референція через кеш)

loadTemplateFile(CEFR_LEVEL.A1).topics.length > 0
→ true
```

---

## 🧪 Тести (як специфікація)

У `loader.test.ts` — 6+ тестів:

1. `loadTemplateFile(A1)` → `file.level === "A1"`, `topics.length > 0`
2. `loadSlotFile(B1)` → `file.slots` визначено
3. `loadNounsFile(B1)` → `file.slots` визначено
4. `loadTemplateFile(B2)` двічі → `first === second` (кеш)
5. `loadTemplateFile` для всіх 8 рівнів → `topics.length > 0`
6. `clearSlotCache()` → наступний виклик читає файл заново

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { CEFR_LEVEL } from "@lingua/shared";
import {
  loadSlotFile,
  loadNounsFile,
  loadTemplateFile,
  clearSlotCache,
} from "./loader";

describe("slot loader", () => {
  beforeEach(() => {
    clearSlotCache();
  });

  // ... тести
});
```

---

## ⚠️ Нюанси

- **`import.meta.url`** — обов'язково використовувати для резолву `data/`. `process.cwd()` ненадійний у тестах.
- **Env `DATA_DIR`** — додати в `.env.example` (порожньо = fallback на `import.meta.url`).
- **Кеш — `Map<CEFRLevel, T>`**, не звичайний об'єкт.
- **При імпорті модуля** — перевірити, що `LEVEL_FILES` має всі 8 рівнів.
- **Vitest з ESM + TypeScript** — може знадобитись `vitest.config.ts` з `test: { globals: true }` і `resolve.alias`. Якщо `pnpm --filter web test` впаде на резолві `@lingua/shared` — додати alias у конфіг.
- **`fs.readFile`** — використовувати `node:fs/promises` (async). Не `fs.readFileSync`.

---

## 📎 Контекст

- `00_CONTEXT.md` → розділи 9, 10
- `docs/tasks/02-docker-compose.md`
- `docs/tasks/04-shared-package.md`

---

## 💬 Commit message

```
feat(slots): add loader for slots and templates JSON files

- add level-files.ts mapping CEFR levels to filenames
- add loader.ts with in-memory cache and clearSlotCache
- resolve data/ via DATA_DIR env or import.meta.url
- add vitest setup and 6+ unit tests
- add DATA_DIR to .env.example
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/07-slot-loader
# ...
git add .
git commit -m "feat(slots): add loader for slots and templates JSON files"
git push origin feat/07-slot-loader
```

---

## 📝 Нотатки

Заповнено після завершення. Статус: ✅ Done.

### Чи `import.meta.url` дав правильний шлях?

**Так, але з виправленням.** У задачі було вказано
`new URL("../../../data/", import.meta.url)` — це дало `apps/data/`
(3 рівні вгору з `apps/web/lib/slots/` → `apps/`).

Правильно — **чотири** рівні: `new URL("../../../../data/", import.meta.url)`
→ `<root>/data/`. Саме так реалізовано в `loader.ts`.
Без цього всі 6 тестів падали з `ENOENT` на `apps/data/`.

Fallback на `process.env.DATA_DIR` працює: якщо задано — шлях береться з env.

### Чи знадобився `vitest.config.ts` з alias?

**Так.** Без alias `@lingua/shared` не резолвився у Vitest.
У `vitest.config.ts` задано:

- `resolve.alias` → `../../packages/shared/src/index.ts` (прямий шлях на src,
  щоб не залежати від збірки пакета)
- `resolve.conditions` → `["node", "import", "module"]`
- `test.globals: true`, `test.environment: "node"`

Після додавання `vitest` у devDependencies знадобився `pnpm install`,
інакше `vitest: command not found`.

### Чи є проблеми з ESM + TypeScript у тестах?

**Суттєвих немає.** Тести працюють:

- `node:fs/promises` та `import.meta.url` — коректні в середовищі Vitest (Node)
- Типи з `@lingua/shared` імпортуються через `import type` — без проблем
- `pnpm typecheck` і `pnpm --filter web test` проходять (6/6 тестів)

### Інше

- Кеш перевірено: другий виклик `loadTemplateFile(B2)` → `toBe` (та сама референція)
- `clearSlotCache()` → наступний виклик читає файл заново (нова референція)
- `DATA_DIR=` додано в `.env.example` (порожній = fallback на `import.meta.url`)
