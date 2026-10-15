# 08 — $ref Resolver

**Епік:** E2 — Data & Shared
**Розмір:** M (2–3 год)
**Залежності:** 05, 07
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

Після завершення задачі:
- `resolveRef(ref, slotLevel, cefrLevel)` → масив рядків
- `resolveTemplate(pattern, cefrLevel, slotLevel)` → шаблон з розкритими слотами
- `resolveTemplateFile(cefrLevel, slotLevel)` → усі теми з розкритими слотами
- Підтримка `slots_*` і `slots_nouns_*`
- Підтримка рівнів `basic / intermediate / advanced`

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
- [ ] Типи `ResolvedPattern`, `ResolvedTemplateTopic` у `@lingua/shared`
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ JSON Pointer з `.` (тільки `/`)
- ❌ `$dynamicRef`, `$recursiveRef`
- ❌ HTTP-резолв
- ❌ Кеш резолвнутих результатів
- ❌ Zod-валідація

---

## 📁 Файли

### Створити

- `apps/web/lib/slots/ref-resolver.ts`
- `apps/web/lib/slots/ref-resolver.test.ts`

### Змінити

- `packages/shared/src/types/template.ts` — додати `ResolvedPattern`, `ResolvedTemplateTopic`

---

## 🔧 Інтерфейси (обов'язково)

### Типи в `@lingua/shared`

```ts
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

### Функції в `ref-resolver.ts`

```ts
export function resolveRef(
  ref: string,
  level: SlotLevel,
  cefrLevel: CEFRLevel
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

**`resolveRef`:**
1. Розібрати `ref` на `<file>` і `<path[]>`.
2. Визначити, який лоадер викликати: `loadSlotFile` чи `loadNounsFile`.
3. Знайти значення по шляху.
4. Визначити формат:
   - якщо масив рядків → повернути;
   - якщо об'єкт з рівнями → вибрати `level` або `default`;
   - інакше — помилка.
5. Повернути масив.

**`resolveTemplate`:**
1. Для кожного слоту в `pattern.slots`:
   - якщо це `$ref` → викликати `resolveRef`;
   - якщо масив → залишити;
   - якщо об'єкт з рівнями → вибрати рівень.
2. Повернути новий pattern з розкритими слотами.

**`resolveTemplateFile`:**
1. Завантажити файл шаблонів через `loadTemplateFile`.
2. Пройтися по всіх topics → subtopics → patterns.
3. Кожен pattern резолвнути через `resolveTemplate`.
4. Повернути структуру з `ResolvedTemplateTopic[]`.

---

## 🔬 Приклади входу/виходу

```
resolveRef("slots_a1#/slots/present_simple/affirmative/V1", INTERMEDIATE, A1)
→ ["work", "study", "live", ...]

resolveRef("slots_nouns_b1#/slots/common/subjects", INTERMEDIATE, B1)
→ ["I", "my brother", "my colleague", ...]

resolveRef("invalid", ...)
→ throws Error("Invalid $ref format: invalid")

resolveTemplate(pattern_ps_01, B1, INTERMEDIATE)
→ { id: "ps_01", pattern: "...", slots: { V1: [...], S: [...], ... }, ... }
```

---

## 🧪 Тести (як специфікація)

1. `resolveRef` з простим масивом (A1) → масив рядків.
2. `resolveRef` з файлом `slots_nouns_*` (B1) → масив рядків.
3. `resolveRef` з `basic` vs `advanced` (B2) → різні масиви.
4. `resolveRef` з невалідним форматом → throws.
5. `resolveRef` з неіснуючим шляхом → throws.
6. `resolveTemplate` для першого pattern B1 → всі слоти масиви, не порожні.
7. `resolveTemplateFile(A1, BASIC)` → усі patterns резолвнуто.
8. **Інтеграційний:** `resolveTemplateFile` для всіх 8 рівнів → без помилок.

`beforeEach` викликає `clearSlotCache()`.

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
- `docs/tasks/05-shared-package.md`
- `docs/tasks/07-slot-loader.md`

---

## 💬 Commit message

```
feat(slots): add $ref resolver for templates

- add ref-resolver.ts with resolveRef, resolveTemplate, resolveTemplateFile
- support slots_* and slots_nouns_* files
- support basic/intermediate/advanced levels
- add ResolvedPattern, ResolvedTemplateTopic types to shared
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

- Чи всі 8 рівнів пройшли інтеграційний тест?
- Чи є шаблони з нерозкривними `$ref`?
- Чи потрібен кеш резолвнутих?