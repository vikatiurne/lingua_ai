# 08 — $ref Resolver

**Епік:** E2 — Data & Shared
**Розмір:** M (2–3 год)
**Залежності:** 04, 07
**Статус:** ⬜ Todo
**Гілка:** `feat/08-ref-resolver`

> ⚠️ **ЦЯ ЗАДАЧА НЕ ТОРКАЄТЬСЯ:**
> - `data/**` — читаємо, не змінюємо
> - `apps/cms/**`
> - AI-провайдери (задача 10)
> - Генерація речень (задача 11+)
>
> **Створюється тільки резолвер `$ref`.**

---

## 🎯 Мета

Після завершення:
- `resolveRef(ref, cefrLevel, slotLevel?)` → масив рядків
- `resolveTemplate(pattern, cefrLevel, slotLevel?)` → шаблон з розкритими слотами
- `resolveTemplateFile(cefrLevel, slotLevel?)` → усі теми з розкритими слотами
- Підтримка `slots_*` і `slots_nouns_*`
- Підтримка рівнів `basic / intermediate / advanced`
- Типи `ResolvedPattern`, `ResolvedTemplateTopic`, `ResolvedSlot` **імпортуються** з `@lingua/shared` (створені в задачі 04)

---

## 🔪 Вертикальний слайс

```
resolveTemplate(ps_01, "B1", intermediate)
    ├─→ для кожного слоту з $ref
    │    ├─→ визначає файл: slots_b1 або slots_nouns_b1
    │    ├─→ витягує шлях
    │    ├─→ читає файл через loader (кеш)
    │    ├─→ іде по шляху
    │    └─→ вибирає рівень
    └─→ повертає pattern з масивами
```

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/lib/slots/ref-resolver.ts`
- [ ] Є `apps/web/lib/slots/ref-resolver.test.ts` — 8+ тестів
- [ ] `resolveRef`, `resolveTemplate`, `resolveTemplateFile` експортуються
- [ ] Підтримка 3 форматів слотів: масив / об'єкт з рівнями / `$ref`
- [ ] Помилки з описом: невалідний формат, неіснуючий шлях
- [ ] Інтеграційний тест: усі 8 рівнів резолвляться без помилок
- [ ] Типи `ResolvedPattern`, `ResolvedTemplateTopic`, `ResolvedSlot` **імпортуються** з `@lingua/shared`
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ JSON Pointer з `.` (тільки `/`)
- ❌ `$dynamicRef`, `$recursiveRef`
- ❌ HTTP-резолв
- ❌ Кеш резолвнутих результатів
- ❌ Zod-валідація
- ❌ Створення типів `ResolvedPattern`, `ResolvedTemplateTopic` — вони вже в `@lingua/shared` (задача 04)

---

## 📁 Файли

### Створити

- `apps/web/lib/slots/ref-resolver.ts`
- `apps/web/lib/slots/ref-resolver.test.ts`

### Не чіпати

- `data/**`
- `packages/shared/**` — тільки імпорт
- `apps/cms/**`
- Prisma
- `apps/web/lib/slots/loader.ts`, `level-files.ts` — створені в задачі 07

---

## 🔧 Інтерфейси (обов'язково)

### Типи (імпортуються з `@lingua/shared`)

```ts
import type {
  CEFRLevel,
  SlotLevel,
  TemplatePattern,
  ResolvedPattern,
  ResolvedTemplateTopic,
} from "@lingua/shared";
import { DEFAULT_SLOT_LEVEL, SLOT_LEVEL } from "@lingua/shared";
```

**НЕ створювати ці типи повторно.** Вони вже в `packages/shared/src/types/template.ts` (задача 04).

### Функції в `ref-resolver.ts`

**Узгоджений порядок аргументів:** спочатку `cefrLevel` (required), потім `slotLevel` (optional, default = `intermediate`).

```ts
export function resolveRef(
  ref: string,
  cefrLevel: CEFRLevel,
  slotLevel?: SlotLevel
): Promise<string[]>;

export function resolveTemplate(
  pattern: TemplatePattern,
  cefrLevel: CEFRLevel,
  slotLevel?: SlotLevel
): Promise<ResolvedPattern>;

export function resolveTemplateFile(
  cefrLevel: CEFRLevel,
  slotLevel?: SlotLevel
): Promise<ResolvedTemplateTopic[]>;
```

---

## 🧠 Алгоритм (словами)

**`resolveRef(ref, cefrLevel, slotLevel = DEFAULT_SLOT_LEVEL)`:**
1. Розібрати `ref` на `<file>` і `<path[]>` через regex.
2. Визначити, який лоадер викликати: `loadSlotFile` чи `loadNounsFile`.
3. Знайти значення по шляху.
4. Визначити формат:
   - якщо масив рядків → повернути;
   - якщо об'єкт з рівнями → вибрати `slotLevel` або `default`;
   - інакше — помилка.
5. Повернути масив.

**`resolveTemplate(pattern, cefrLevel, slotLevel = DEFAULT_SLOT_LEVEL)`:**
1. Для кожного слоту в `pattern.slots`:
   - якщо це `$ref` → викликати `resolveRef`;
   - якщо масив → залишити;
   - якщо об'єкт з рівнями → вибрати рівень.
2. Повернути новий pattern з розкритими слотами.

**`resolveTemplateFile(cefrLevel, slotLevel = DEFAULT_SLOT_LEVEL)`:**
1. Завантажити файл шаблонів через `loadTemplateFile`.
2. Пройтися по всіх topics → subtopics → patterns.
3. Кожен pattern резолвнути через `resolveTemplate`.
4. Повернути структуру з `ResolvedTemplateTopic[]`.

---

## 🔬 Приклади входу/виходу

```ts
// resolveRef(ref, cefrLevel, slotLevel?)
resolveRef("slots_a1#/slots/present_simple/affirmative/V1", CEFR_LEVEL.A1)
→ ["work", "study", "live", ...]  // intermediate за замовчуванням

resolveRef("slots_a1#/slots/present_simple/affirmative/V1", CEFR_LEVEL.A1, SLOT_LEVEL.BASIC)
→ ["work", "study", ...]  // basic

resolveRef("slots_nouns_b1#/slots/common/subjects", CEFR_LEVEL.B1)
→ ["I", "my brother", "my colleague", ...]

resolveRef("invalid", CEFR_LEVEL.B1)
→ throws Error("Invalid $ref format: invalid")

// resolveTemplate(pattern, cefrLevel, slotLevel?)
resolveTemplate(pattern_ps_01, CEFR_LEVEL.B1)
→ { id: "ps_01", pattern: "...", slots: { V1: [...], S: [...], ... }, ... }

// resolveTemplateFile(cefrLevel, slotLevel?)
resolveTemplateFile(CEFR_LEVEL.A1, SLOT_LEVEL.BASIC)
→ [{ topic: "...", subtopics: [{ name: "...", patterns: [...] }] }, ...]
```

---

## 🧪 Тести (як специфікація)

У `ref-resolver.test.ts` — 8+ тестів:

1. `resolveRef` з простим масивом (A1) → масив рядків.
2. `resolveRef` з файлом `slots_nouns_*` (B1) → масив рядків.
3. `resolveRef` з `basic` vs `advanced` (B2) → різні масиви.
4. `resolveRef` з невалідним форматом → throws `/Invalid \$ref/`.
5. `resolveRef` з неіснуючим шляхом → throws `/path not found/`.
6. `resolveTemplate` для першого pattern B1 → всі слоти масиви, не порожні.
7. `resolveTemplateFile(A1, BASIC)` → усі patterns резолвнуто.
8. **Інтеграційний:** `resolveTemplateFile` для всіх 8 рівнів → без помилок.

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { CEFR_LEVEL, SLOT_LEVEL } from "@lingua/shared";
import { clearSlotCache } from "./loader";
import { resolveRef, resolveTemplate, resolveTemplateFile } from "./ref-resolver";

describe("ref-resolver", () => {
  beforeEach(() => {
    clearSlotCache();
  });

  // ... тести
});
```

---

## ⚠️ Нюанси (тільки хрупке)

### Regex для парсингу `$ref`

```ts
const REF_PATTERN = /^(slots(?:_nouns)?_[a-z0-9_]+)#\/(.+)$/;
```

- Група 1 — ім'я файлу без розширення (`slots_b1`, `slots_nouns_a2_plus`).
- Група 2 — шлях без `#/`.
- Розділювач шляху — `/`.
- Порожні сегменти відфільтровуються.

### Визначення лоадера

- Якщо `<file>` починається з `slots_nouns_` → `loadNounsFile`.
- Інакше якщо `slots_` → `loadSlotFile`.
- Інакше — помилка.

### Пріоритет рівня

При виборі рівня з об'єкта:
1. `obj[slotLevel]`
2. `obj[DEFAULT_SLOT_LEVEL]` (intermediate)
3. `obj.basic`
4. Якщо нічого — помилка.

### Шлях `to_V1` (underscore, не `to + V1`)

У JSON ключі типу `to_V1` — без пробілів. Парсер працює як є.

### Спецсимволи в shell-коміті

У commit message символ `$` екранується: `\$ref`.

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 10
- `docs/tasks/04-shared-package.md`
- `docs/tasks/07-slot-loader.md`

---

## 💬 Commit message

```
feat(slots): add $ref resolver for templates

- add ref-resolver.ts with resolveRef, resolveTemplate, resolveTemplateFile
- support slots_* and slots_nouns_* files
- support basic/intermediate/advanced levels
- use ResolvedPattern, ResolvedTemplateTopic from @lingua/shared
- add 8 unit tests including integration over all 8 CEFR levels
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/08-ref-resolver
# ...
git add .
git commit -m "feat(slots): add \$ref resolver for templates"
git push origin feat/08-ref-resolver
```

---

## 📝 Нотатки

Заповнюється після завершення.

- Чи всі 8 рівнів пройшли інтеграційний тест?
- Чи є шаблони з нерозкривними `$ref`?
- Чи потрібен кеш резолвнутих результатів?