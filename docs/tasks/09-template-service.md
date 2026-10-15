# 09 — Template Service

**Епік:** E2 — Data & Shared
**Розмір:** S (1–2 год)
**Залежності:** 05, 07, 08
**Статус:** ⬜ Todo
**Гілка:** `feat/09-template-service`

> ⚠️ **ЦЯ ЗАДАЧА — ЗРУЧНИЙ API ПОВЕРХ РЕЗОЛВЕРА.**
> Резолвер (задача 08) дає повний файл. Сервіс — точкові запити:
> «дай мені pattern за id», «дай наступну невивчену підтему», «дай усі patterns рівня».
>
> ⚠️ **ЦЯ ЗАДАЧА НЕ ТОРКАЄТЬСЯ:**
> - UI (задача 22+)
> - AI-провайдери (задача 10)
> - Prisma (задача 06)

---

## 🎯 Мета

Після завершення задачі:
- `getTopicsForLevel(level)` → список назв тем
- `getSubtopicsForTopic(level, topicName)` → список підтем
- `getPatternsForSubtopic(level, topic, subtopic)` → масив `ResolvedPattern`
- `getPatternById(level, patternId)` → один `ResolvedPattern` або `null`
- `getAllPatternIdsForLevel(level)` → усі id (для перевірки прогресу)

Сервіс використовує кеш резолвера та повертає плоскі структури, зручні для UI.

---

## 🔪 Вертикальний слайс

```
getPatternById("B1", "ps_01")
    ├─→ loadTemplateFile(B1) через loader (кеш)
    ├─→ resolveTemplateFile(B1, intermediate) (кеш)
    ├─→ фільтр по id
    └─→ повертає ResolvedPattern | null
```

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/lib/slots/template-service.ts`
- [ ] Є `apps/web/lib/slots/template-service.test.ts` — 6+ тестів
- [ ] Усі 5 функцій експортуються
- [ ] `getPatternById` повертає `null` для неіснуючого id
- [ ] `getPatternsForSubtopic` повертає масив (порожній, якщо нічого не знайдено)
- [ ] Кеш: повторні виклики швидкі (перевірка через `toHaveBeenCalledTimes` на моках або просто по часу)
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Кеш резолвнутих результатів у пам'яті (може бути пізніше)
- ❌ Пошук за regex по назві
- ❌ Локалізація назв тем (задача 45)
- ❌ Визначення «наступної підтеми» для учня (задача 25 — окремо, з урахуванням прогресу)

---

## 📁 Файли

### Створити

- `apps/web/lib/slots/template-service.ts`
- `apps/web/lib/slots/template-service.test.ts`

### Змінити

- `packages/shared/src/types/template.ts` — додати `TemplateTopicSummary` (опційно)

---

## 🔧 Інтерфейси (обов'язково)

```ts
export function getTopicsForLevel(level: CEFRLevel): Promise<string[]>;

export function getSubtopicsForTopic(
  level: CEFRLevel,
  topicName: string
): Promise<string[]>;

export function getPatternsForSubtopic(
  level: CEFRLevel,
  topicName: string,
  subtopicName: string
): Promise<ResolvedPattern[]>;

export function getPatternById(
  level: CEFRLevel,
  patternId: string
): Promise<ResolvedPattern | null>;

export function getAllPatternIdsForLevel(
  level: CEFRLevel
): Promise<string[]>;
```

Всі функції приймають `slotLevel?: SlotLevel` (default `intermediate`) як останній опційний параметр.

---

## 🧠 Алгоритм (словами)

**`getTopicsForLevel(level)`:**
1. `resolveTemplateFile(level, slotLevel)`.
2. Повернути масив `topic` з кожного елемента.

**`getSubtopicsForTopic(level, topicName)`:**
1. `resolveTemplateFile(level, slotLevel)`.
2. Знайти topic за назвою.
3. Повернути список `subtopic.name`.
4. Якщо не знайдено — порожній масив.

**`getPatternsForSubtopic(level, topic, subtopic)`:**
1. `resolveTemplateFile(level, slotLevel)`.
2. Знайти topic → subtopic.
3. Повернути `subtopic.patterns`.
4. Якщо не знайдено — порожній масив.

**`getPatternById(level, patternId)`:**
1. `resolveTemplateFile(level, slotLevel)`.
2. Пройтися по всіх topics / subtopics / patterns.
3. Знайти pattern з `id === patternId`.
4. Повернути або `null`.

**`getAllPatternIdsForLevel(level)`:**
1. `resolveTemplateFile(level, slotLevel)`.
2. Зібрати всі `pattern.id` у плоский масив.

---

## 🔬 Приклади входу/виходу

```
getTopicsForLevel(A1)
→ ["Verb to be (am/is/are)", "Subject Pronouns and Possessive Adjectives", ...]

getSubtopicsForTopic(B1, "Present Tenses")
→ ["Present Simple", "Present Continuous", "Present Perfect", "Present Perfect Continuous"]

getPatternById(B1, "ps_01")
→ { id: "ps_01", pattern: "[S] + [V1] + ...", slots: {...}, ... }

getPatternById(B1, "unknown_id")
→ null

getAllPatternIdsForLevel(B1).length
→ число (наприклад, ~45)
```

---

## 🧪 Тести (як специфікація)

1. `getTopicsForLevel(A1)` → непорожній масив.
2. `getSubtopicsForTopic(B1, "Present Tenses")` → містить "Present Simple".
3. `getSubtopicsForTopic(B1, "Unknown")` → `[]`.
4. `getPatternsForSubtopic(B1, "Present Tenses", "Present Simple")` → length > 0.
5. `getPatternById(B1, "ps_01")` → pattern з `id === "ps_01"`.
6. `getPatternById(B1, "zzz")` → `null`.
7. `getAllPatternIdsForLevel(C1)` → length > 0, усі рядки.
8. Для всіх 8 рівнів `getTopicsForLevel` повертає ≥ 1 тему.

`beforeEach` → `clearSlotCache()`.

---

## ⚠️ Нюанси

- **Назви тем** — точний рядок з JSON (з підтемами в дужках, якщо є: `"Modal Verbs (Obligation)"`).
- **Регістр** — чутливий. Якщо треба нечутливий пошук — окремо.
- **Кеш резолвнутих** — наразі відсутній, кожен виклик резолвить заново. Для 8 рівнів це швидко (< 100 мс). Якщо стане повільно — оптимізувати в задачі 24.
- **`getPatternById`** — лінійний пошук O(n). Для 40–50 patterns на рівень це нормально.

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 10
- `docs/tasks/05-shared-package.md`
- `docs/tasks/07-slot-loader.md`
- `docs/tasks/08-ref-resolver.md`

---

## 💬 Commit message

```
feat(slots): add template service for convenient lookups

- add template-service.ts with getTopicsForLevel, getSubtopicsForTopic
- add getPatternsForSubtopic, getPatternById, getAllPatternIdsForLevel
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

- Чи достатньо швидкі повторні виклики?
- Чи потрібен кеш резолвнутих файлів?