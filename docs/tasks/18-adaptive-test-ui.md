# 18 — Adaptive Test UI

**Епік:** E5 — Level Test
**Розмір:** M (2–3 год)
**Залежності:** 16.5, 17
**Статус:** ✅ Done (rework after set 1/2 split + no cap + level ladder)
**Гілка:** `feat/18-adaptive-test-ui`

> ⚠️ **ОНОВЛЕНО (rework).**
> Питання тепер **80** (10 на рівень = 2 набори по 5). Алгоритм має обирати set 1 при
> першому вході на рівень, set 2 при поверненні. Це вирішує проблему осцилляції без
> повторів і без зависань.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Submit на сервер (19)
> - Gap map (20)
> - Оновлення `User.level` (19)

---

## 🎯 Мета

Після завершення:
- Сторінка `/test` — адаптивний тест з 80 питань (2 набори × 5 × 8 рівнів)
- Показує питання по одному, 4 варіанти
- Sequential з переходами + **set 1 / set 2 при осцилляції**
- Прогрес: драбинка рівнів CEFR (A1→C2) з підсвіченим поточним + лічильник питань
- Після завершення — екран з результатом (рівень + score)

---

## ✅ Acceptance Criteria

- [x] `data/test_questions.json` — 80 питань, кожне має `set: 1 | 2`
- [x] `apps/web/lib/test/loader.ts` — тип `TestQuestion` з полем `set`
- [x] `apps/web/lib/test/adaptive.ts` — 5 функцій + логіка вибору set
- [x] `apps/web/lib/test/adaptive.test.ts` — 8+ тестів (включно з осцилляцією)
- [x] `apps/web/app/(dashboard)/test/page.tsx` — Server Component
- [x] `apps/web/components/test/test-runner.tsx` — client, стан
- [x] `apps/web/components/test/question-card.tsx` (4 варіанти + кнопка «Не знаю»)
- [x] «Не знаю» → рахується як неправильна + `skipped: true` у `history`
- [x] Тултіп на кнопці «Не знаю» (пояснює семантику)
- [x] Тема питання НЕ показується на екрані (щоб не підказувати); лишається в даних для gap map
- [x] `apps/web/components/test/level-ladder.tsx`
- [x] `apps/web/components/test/test-result.tsx`
- [x] Старт: A2, set 1, 5 питань підряд, потім перехід вище/нижче/стабілізація
- [x] Осцилляція: повернення на рівень → set 2 (не ті самі питання)
- [x] Третій захід на рівень → завершити тест (крайній випадок)
- [x] Без стелі питань: тест завершується стабілізацією (3/5), межею A1/C2 або вичерпанням пулу
- [x] Кнопка «Почати навчання» → `/dashboard`
- [x] Адаптивно, light + dark
- [x] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить

- ❌ Submit на сервер (19)
- ❌ Збереження `User.level` (19)
- ❌ Gap map (20)
- ❌ Таймер, повернення назад, показ правильних
- ❌ Streak, XP, ачивки

---

## 📁 Файли

### Створити (або оновити після rework)

- `data/test_questions.json` (80 питань — готовий файл передано)
- `apps/web/lib/test/loader.ts` (додати поле `set`)
- `apps/web/lib/test/adaptive.ts` (додати логіку set)
- `apps/web/lib/test/adaptive.test.ts`
- `apps/web/app/(dashboard)/test/page.tsx`
- `apps/web/components/test/test-runner.tsx`
- `apps/web/components/test/question-card.tsx`
- `apps/web/components/test/level-ladder.tsx`
- `apps/web/components/test/test-result.tsx`

### Не чіпати

- `apps/web/lib/ai/**`, `redis/**`, `slots/**`
- `apps/web/app/api/**`
- `packages/shared/**`
- `apps/cms/**`

---

## 🔧 Контракти (обов'язково)

### Тип `TestQuestion` (у `loader.ts`)

```ts
type TestQuestion = {
  id: string;
  level: CEFRLevel;
  set: 1 | 2;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
};
```

### Функції `adaptive.ts`

```ts
startTest(questions: TestQuestion[]): AdaptiveState
getNextQuestion(state: AdaptiveState, questions: TestQuestion[]): TestQuestion | null
submitAnswer(state: AdaptiveState, correct: boolean, skipped?: boolean): AdaptiveState
isFinished(state: AdaptiveState): boolean
getResult(state: AdaptiveState): { level: CEFRLevel; correctCount: number; totalCount: number }
```

**`AdaptiveState`** — внутрішній, визначити як зручно. Мінімум має містити:
- `currentLevelIndex`
- `currentSet: 1 | 2` (для поточного рівня)
- `askedQuestionIds: Set<string>` (глобально, щоб не повторювати взагалі)
- `correctInLevel`, `askedInLevel`
- `totalAsked`, `totalCorrect`
- `history: { questionId: string; correct: boolean; skipped: boolean }[]`

---

## 🧠 Алгоритм (словами)

**CEFR_LEVELS** = `[A1, A2, A2_PLUS, B1, B1_PLUS, B2, C1, C2]`.

**Старт:** `currentLevelIndex = 1` (A2), `currentSet = 1`.

**Головний цикл:**

1. Вибрати випадкове питання рівня `CEFR_LEVELS[currentLevelIndex]` з `set === currentSet`, ще не задане (`id` не в `askedQuestionIds`).

2. Якщо такого питання немає (пул set вичерпано):
   - Якщо `currentSet === 1` → перемкнути на `set 2`, спробувати знову.
   - Якщо `currentSet === 2` → **завершити тест** (крайній випадок: 3-й захід на рівень — майже неможливий).

3. Показати → користувач обирає → зарахувати `correct`. Додати `id` в `askedQuestionIds`.

4. **Після 5 питань цього рівня:**
   - ≥ 4 правильних → перейти на рівень вище (`currentLevelIndex += 1`), `currentSet = 1`, скинути `correctInLevel = 0, askedInLevel = 0`.
   - ≤ 2 правильних → перейти на рівень нижче, `currentSet = 1`, скинути.
   - = 3 → **стабілізувалися** → тест завершено. `level = CEFR_LEVELS[currentLevelIndex]`.

5. **При поверненні на рівень** (після кроку 4 з переходом): `currentSet` для цього рівня = 2 (якщо вже були на ньому з set 1). Відстежувати через `Set<levelIndex>` — які рівні вже відвідувались.

6. Якщо `currentLevelIndex` вийшов за межі → клемп до A1 / C2 і завершити.

**Без стелі питань.** Тест не має штучного ліміту кількості: він завершується лише стабілізацією (3/5), межею A1/C2 або вичерпанням пулу (set 2 на повторному рівні).

**Приклад:** Start A2 → set 1 → 4/5 → A2_PLUS → set 1 → 3/5 → stabilize → **A2_PLUS**.

**Приклад осцилляції:** Start A2 → set 1 → 2/5 → A1 → set 1 → 4/5 → A2 → **set 2** → 3/5 → stabilize → **A2**.

---

## 🧪 Тести (8+)

1. `startTest` → index = 1 (A2), `currentSet = 1`.
2. 5 правильних на A2 → перехід на A2_PLUS.
3. 5 неправильних на A2 → перехід на A1.
4. 3 правильних + 2 неправильних → стабілізація, тест завершено.
5. 35+ питань → без стелі доходить до C2 і завершується на межі.
6. `getResult` повертає `{ level, correctCount, totalCount }`.
7. **Осцилляція:** A2 → A2_PLUS → A2 → на другому заході задаються питання `set 2`.
8. **Пули:** при заходах на різні рівні задаються питання з відповідних set.
9. **Не повторюються:** `askedQuestionIds` не дає двічі задати одне питання.
10. **«Не знаю»:** рахується як неправильна + `skipped: true` у `history`.

---

## ⚠️ Нюанси

- **Старт з A2** — компроміс.
- **Random вибір питання** — `Math.random` + `askedQuestionIds`.
- **Прогрес** — драбинка рівнів CEFR (A1→C2) з підсвіченим поточним + «Питання N» (без тоталу).
- **Не показувати правильний** після вибору.
- **«Не знаю»** — кнопка під варіантами; рахується як неправильна (`correct = false`), але з прапорцем `skipped: true` у `history`, щоб gap map (20) відрізнив «не знаю» від «переплутав». Має тултіп з поясненням (`components/ui/tooltip.tsx`).
- **Тема не показується на екрані питання.** Лейбл граматичної теми («Comparatives») — це підказка, що біасить відповідь і знижує валідність. Поле `topic` лишається в даних (gap map 20 / аналітика), але не рендериться під час тесту.
- **`(dashboard)` route group** — тест захищений middleware (17). Без логіна → `/login`.
- **JSON читається через `fs`** — через `fileURLToPath(import.meta.url)` + `DATA_DIR` (як у 07).
- **Осцилляція.** Два набори (set 1 / set 2) на рівень. Відслідковувати відвідані рівні (`Set<number> visitedLevels`). При повторному вході на рівень — `currentSet = 2`.
- **Третій захід.** Якщо `currentSet === 2` і пул вичерпано → завершити тест з поточним рівнем (практично неможливо, але обробити треба).
- **UI (brief):** прогрес-бар → тема (дрібно, сірим) → питання → 4 кнопки-варіанти (повна ширина, hover). Результат — заголовок рівня + score + кнопка.

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 9 (CEFR)
- `docs/tasks/16.5-ui-foundation.md`
- `docs/tasks/17-user-helpers.md`
- `AGENT_RULES.md` → розділ 7.1

---

## 💬 Commit message

```
feat(test): add adaptive level test UI with 2 sets per level

- add data/test_questions.json with 80 questions (10 per level, 2 sets of 5)
- add lib/test/loader.ts to read questions (with set field)
- add lib/test/adaptive.ts with sequential transition algorithm
- start at A2 set 1, switch to set 2 on return to a level
- stabilize at 3/5, no question cap
- level ladder (A1→C2) progress with question counter
- add /test page with TestRunner client component
- add QuestionCard, LevelLadder, TestResult components
- protect /test via middleware
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/18-adaptive-test-ui
# ...
git add .
git commit -m "feat(test): add adaptive level test UI with 2 sets per level"
git push origin feat/18-adaptive-test-ui
```

---

## 📝 Нотатки

**Статус:** rework завершено. `pnpm typecheck`, `pnpm build`, `pnpm --filter web test` (10 тестів у `adaptive.test.ts`, всього 121) — зелені.

### Відповіді на питання
с

### README не змінювався

Жоден пункт статусу не завершено: результат/рівень зберігає задача 19.