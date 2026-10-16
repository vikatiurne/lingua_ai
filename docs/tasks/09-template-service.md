# 09 — Template Service

**Епік:** E2 — Data & Shared
**Розмір:** S (1–2 год)
**Залежності:** 04, 07, 08
**Статус:** ✅ Done
**Гілка:** `feat/09-template-service`

> ⚠️ **ЦЯ ЗАДАЧА — ЗРУЧНИЙ API ПОВЕРХ РЕЗОЛВЕРА.**
> Резолвер (задача 08) дає повний файл. Сервіс — точкові запити:
> «дай мені pattern за id», «дай наступну невивчену підтему», «дай усі patterns рівня».
>
> ⚠️ **ЦЯ ЗАДАЧА НЕ ТОРКАЄТЬСЯ:**
> - UI (задача 22+)
> - AI-провайдери (задача 10)
> - Prisma (задача 06)
> - Типи `ResolvedPattern`, `ResolvedTemplateTopic` — вони вже в `@lingua/shared` (задача 04)

---

## 🎯 Мета

Після завершення задачі:
- `getTopicsForLevel(level)` → список назв тем
- `getSubtopicsForTopic(level, topicName)` → список підтем
- `getPatternsForSubtopic(level, topic, subtopic)` → масив `ResolvedPattern`
- `getPatternById(level, patternId)` → один `ResolvedPattern` або `null`
- `getAllPatternIdsForLevel(level)` → усі id (для перевірки прогресу)
- `clearTemplateServiceCache()` — для тестів

Сервіс використовує кеш резолвера та **додатково кешує резолвнуті файли**, щоб не резолвити 45+ patterns при кожному виклику.

---

## 🔪 Вертикальний слайс

```
getPatternById("B1", "ps_01")
    ├─→ getResolvedFile(B1, intermediate)
    │    ├─→ resolvedCache.get("B1:intermediate")   ← hit на 2-му виклику
    │    └─→ або resolveTemplateFile(B1, intermediate) → resolvedCache.set(...)
    ├─→ фільтр по id
    └─→ повертає ResolvedPattern | null
```

---

## ✅ Acceptance Criteria

- [x] Є `apps/web/lib/slots/template-service.ts`
- [x] Є `apps/web/lib/slots/template-service.test.ts` — 8+ тестів (фактично 11)
- [x] Усі 5 функцій + `clearTemplateServiceCache` експортуються
- [x] `getPatternById` повертає `null` для неіснуючого id
- [x] `getPatternsForSubtopic` повертає масив (порожній, якщо нічого не знайдено)
- [x] **Кеш резолвнутих працює:** другий виклик `getTopicsForLevel(A1)` не робить повторний резолв
- [x] `clearTemplateServiceCache()` експортується (для тестів)
- [x] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Пошук за regex по назві
- ❌ Локалізація назв тем (задача 45)
- ❌ Визначення «наступної підтеми» для учня (задача 25 — окремо, з урахуванням прогресу)
- ❌ Створення типів `ResolvedPattern`, `ResolvedTemplateTopic` — вони в `@lingua/shared`

---

## 📁 Файли

### Створити

- `apps/web/lib/slots/template-service.ts`
- `apps/web/lib/slots/template-service.test.ts`

### Не чіпати

- `packages/shared/**` — тільки імпорт
- `data/**`
- `apps/web/lib/slots/loader.ts`, `ref-resolver.ts`, `level-files.ts` — створені в задачах 07, 08
- `apps/cms/**`
- Prisma

---

## 🔧 Інтерфейси (обов'язково)

### Функції в `template-service.ts`

```ts
import type {
  CEFRLevel,
  SlotLevel,
  ResolvedPattern,
  ResolvedTemplateTopic,
} from "@lingua/shared";

export function getTopicsForLevel(
  level: CEFRLevel,
  slotLevel?: SlotLevel
): Promise<string[]>;

export function getSubtopicsForTopic(
  level: CEFRLevel,
  topicName: string,
  slotLevel?: SlotLevel
): Promise<string[]>;

export function getPatternsForSubtopic(
  level: CEFRLevel,
  topicName: string,
  subtopicName: string,
  slotLevel?: SlotLevel
): Promise<ResolvedPattern[]>;

export function getPatternById(
  level: CEFRLevel,
  patternId: string,
  slotLevel?: SlotLevel
): Promise<ResolvedPattern | null>;

export function getAllPatternIdsForLevel(
  level: CEFRLevel,
  slotLevel?: SlotLevel
): Promise<string[]>;

export function clearTemplateServiceCache(): void;
```

**Узгоджений порядок аргументів:** спочатку required (level, імена), потім `slotLevel` (optional, default = `intermediate`).

---

## 🧠 Алгоритм (словами)

### Внутрішній кеш

```ts
const resolvedCache = new Map<string, ResolvedTemplateTopic[]>();

function cacheKey(cefrLevel: CEFRLevel, slotLevel: SlotLevel): string {
  return `${cefrLevel}:${slotLevel}`;
}

async function getResolvedFile(
  cefrLevel: CEFRLevel,
  slotLevel: SlotLevel
): Promise<ResolvedTemplateTopic[]> {
  const key = cacheKey(cefrLevel, slotLevel);
  const cached = resolvedCache.get(key);
  if (cached) return cached;

  const resolved = await resolveTemplateFile(cefrLevel, slotLevel);
  resolvedCache.set(key, resolved);
  return resolved;
}

export function clearTemplateServiceCache(): void {
  resolvedCache.clear();
}
```

**Усі публічні функції використовують `getResolvedFile`** замість прямого `resolveTemplateFile`.

### `getTopicsForLevel(level, slotLevel = DEFAULT_SLOT_LEVEL)`

1. `const file = await getResolvedFile(level, slotLevel)`.
2. Повернути `file.map((t) => t.topic)`.

### `getSubtopicsForTopic(level, topicName, slotLevel)`

1. `const file = await getResolvedFile(level, slotLevel)`.
2. Знайти `topic` за `topic === topicName`.
3. Якщо не знайдено — `[]`.
4. Повернути `topic.subtopics.map((s) => s.name)`.

### `getPatternsForSubtopic(level, topicName, subtopicName, slotLevel)`

1. `const file = await getResolvedFile(level, slotLevel)`.
2. Знайти `topic` за назвою.
3. Знайти `subtopic` за назвою.
4. Якщо не знайдено — `[]`.
5. Повернути `subtopic.patterns`.

### `getPatternById(level, patternId, slotLevel)`

1. `const file = await getResolvedFile(level, slotLevel)`.
2. Пройтися по всіх `topics → subtopics → patterns`.
3. Знайти `pattern.id === patternId`.
4. Повернути pattern або `null`.

### `getAllPatternIdsForLevel(level, slotLevel)`

1. `const file = await getResolvedFile(level, slotLevel)`.
2. Зібрати всі `pattern.id` у плоский масив.
3. Повернути.

---

## 🔬 Приклади входу/виходу

```ts
getTopicsForLevel(CEFR_LEVEL.A1)
→ ["Verb to be (am/is/are)", "Subject Pronouns and Possessive Adjectives", ...]

getSubtopicsForTopic(CEFR_LEVEL.B1, "Present Tenses")
→ ["Present Simple", "Present Continuous", "Present Perfect", "Present Perfect Continuous"]

getPatternsForSubtopic(CEFR_LEVEL.B1, "Present Tenses", "Present Simple")
→ [{ id: "ps_01", ... }, { id: "ps_02", ... }, ...]

getPatternById(CEFR_LEVEL.B1, "ps_01")
→ { id: "ps_01", pattern: "[S] + [V1] + ...", slots: {...}, ... }

getPatternById(CEFR_LEVEL.B1, "unknown_id")
→ null

getAllPatternIdsForLevel(CEFR_LEVEL.C1).length
→ число (наприклад, ~22)
```

---

## 🧪 Тести (як специфікація)

У `template-service.test.ts` — 8+ тестів:

1. `getTopicsForLevel(A1)` → непорожній масив.
2. `getSubtopicsForTopic(B1, "Present Tenses")` → містить `"Present Simple"`.
3. `getSubtopicsForTopic(B1, "Unknown")` → `[]`.
4. `getPatternsForSubtopic(B1, "Present Tenses", "Present Simple")` → `length > 0`.
5. `getPatternById(B1, "ps_01")` → pattern з `id === "ps_01"`.
6. `getPatternById(B1, "zzz")` → `null`.
7. `getAllPatternIdsForLevel(C1)` → `length > 0`, усі — рядки.
8. Для всіх 8 рівнів `getTopicsForLevel` повертає ≥ 1 тему.
9. **Кеш:** два виклики `getTopicsForLevel(A1)` підряд → друга повертає ту саму референцію (можна перевірити через `toBe` на масиві, або через spy на `resolveTemplateFile`).

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { CEFR_LEVEL } from "@lingua/shared";
import { clearSlotCache } from "./loader";
import {
  getTopicsForLevel,
  getSubtopicsForTopic,
  getPatternsForSubtopic,
  getPatternById,
  getAllPatternIdsForLevel,
  clearTemplateServiceCache,
} from "./template-service";

describe("template-service", () => {
  beforeEach(() => {
    clearSlotCache();
    clearTemplateServiceCache();
  });

  // ... тести
});
```

---

## ⚠️ Нюанси

- **Назви тем** — точний рядок з JSON (з підтемами в дужках, якщо є: `"Modal Verbs (Obligation)"`).
- **Регістр** — чутливий. Якщо треба нечутливий пошук — окремо.
- **Кеш резолвнутих файлів:** у сервісі є `Map<string, ResolvedTemplateTopic[]>` (ключ — `${cefrLevel}:${slotLevel}`). Перший виклик резолвить і кешує, наступні — повертають з кешу. Очищається через `clearTemplateServiceCache()`.
- **Кеш у пам'яті процесу** — це нормально для Next.js dev. Для serverless (Vercel) кеш може не переживати між invocations — це ок, прийнятно.
- **`getPatternById`** — лінійний пошук O(n). Для 40–50 patterns на рівень це нормально.
- **Не дублювати кеш резолвера.** У задачі 08 резолвер свідомо не кешує. Тут кеш на рівні сервісу.

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 10
- `docs/tasks/04-shared-package.md`
- `docs/tasks/07-slot-loader.md`
- `docs/tasks/08-ref-resolver.md`

---

## 💬 Commit message

```
feat(slots): add template service for convenient lookups

- add template-service.ts with getTopicsForLevel, getSubtopicsForTopic
- add getPatternsForSubtopic, getPatternById, getAllPatternIdsForLevel
- add in-memory cache for resolved files (key: cefrLevel:slotLevel)
- add clearTemplateServiceCache() for tests
- add unit tests covering all 8 levels
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/09-template-service
# ...
git add .
git commit -m "feat(slots): add template service for convenient lookups"
git push origin feat/09-template-service
```

---

## 📝 Нотатки

- **Швидкість:** перший виклик `getTopicsForLevel(A1)` ≈ 3.5 мс (резолв + запис у кеш), повторний ≈ 0 мс. `getPatternById(B1, "ps_01")` перший ≈ 1.2 мс, повторний ≈ 0 мс. Кеш працює.
- **`clearTemplateServiceCache()` у тестах — знадобився обов'язково:** без нього кеш перетинався б між тестами (Map живе на рівні модуля). Викликається в `beforeEach` разом із `clearSlotCache()`.
- **Кеш-тест через `toBe` на масиві не працює:** `getTopicsForLevel` робить `file.map(...)`, тож масив щоразу новий, референція не збігається. У тесті використано `vi.mock("./ref-resolver")` + лічильник викликів `resolveTemplateFile` (варіант «spy», дозволений у задачі).
- **Дублікати назв тем між рівнями є:** 13 назв повторюються (напр. `Modal Verbs`, `Conditionals`, `Passive Voice` — по 3 рівні: A2, A2+, B1). Це нормально, бо кожен рівень має власний файл; сервіс працює в межах одного рівня, конфліктів немає. Для UI-навігації «рівень → тема» дублікати безпечні.
- **Назва теми B1 `Present Tenses`, підтема `Present Simple`** — підтверджено тестом, `ps_01`/`ps_02` є в `templates_b1_advanced.json`.
- Тести: 11 (10 специфікаційних + 1 на `clearTemplateServiceCache`).