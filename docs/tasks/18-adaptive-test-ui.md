# 18 — Adaptive Test UI

**Епік:** E5 — Level Test
**Розмір:** M (2–3 год)
**Залежності:** 16.5, 17
**Статус:** ⬜ Todo
**Гілка:** `feat/18-adaptive-test-ui`

> ⚠️ **ЦЯ ЗАДАЧА — UI ТЕСТУ РІВНЯ (БЕЗ БЕКЕНДУ).**
> Питання вже в `data/test_questions.json` (40 шт., 5 на рівень).
> Алгоритм адаптивності — на клієнті, результат у state. Submit — задача 19.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Submit на сервер (19)
> - Gap map (20)
> - Оновлення `User.level` (19)
> - Dashboard (22)

---

## 🎯 Мета

Після завершення:
- Сторінка `/test` — адаптивний тест
- Показує питання по одному, 4 варіанти
- Sequential з переходами: стабілізація на рівні
- Прогрес-бар: X / 25
- Після завершення — екран з результатом (рівень + score)

---

## ✅ Acceptance Criteria

- [ ] `data/test_questions.json` — 40 питань (скопійовано)
- [ ] `apps/web/lib/test/loader.ts` — `TestQuestion` тип + завантаження JSON
- [ ] `apps/web/lib/test/adaptive.ts` — 5 функцій (сигнатури нижче)
- [ ] `apps/web/lib/test/adaptive.test.ts` — 6+ тестів
- [ ] `apps/web/app/(dashboard)/test/page.tsx` — Server Component
- [ ] `apps/web/components/test/test-runner.tsx` — client, стан
- [ ] `apps/web/components/test/question-card.tsx`
- [ ] `apps/web/components/test/progress-bar.tsx`
- [ ] `apps/web/components/test/test-result.tsx`
- [ ] Логіка старту: A2, 5 питань підряд, потім перехід вище/нижче/стабілізація
- [ ] Максимум 25 питань
- [ ] Кнопка «Почати навчання» → `/dashboard`
- [ ] Адаптивно, light + dark
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить

- ❌ Submit на сервер (19)
- ❌ Збереження `User.level` (19)
- ❌ Gap map (20)
- ❌ Таймер, повернення назад, показ правильних відповідей
- ❌ Streak, XP, ачивки

---

## 📁 Файли

### Створити

- `data/test_questions.json` (скопіювати з чату)
- `apps/web/lib/test/loader.ts`
- `apps/web/lib/test/adaptive.ts`
- `apps/web/lib/test/adaptive.test.ts`
- `apps/web/app/(dashboard)/test/page.tsx`
- `apps/web/components/test/test-runner.tsx`
- `apps/web/components/test/question-card.tsx`
- `apps/web/components/test/progress-bar.tsx`
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
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
};
```

Поля **точно** такі — вони з `data/test_questions.json`.

### Функції `adaptive.ts`

```ts
startTest(questions: TestQuestion[]): AdaptiveState
getNextQuestion(state: AdaptiveState, questions: TestQuestion[]): TestQuestion | null
submitAnswer(state: AdaptiveState, correct: boolean): AdaptiveState
isFinished(state: AdaptiveState): boolean
getResult(state: AdaptiveState): { level: CEFRLevel; correctCount: number; totalCount: number }
```

**Тип `AdaptiveState`** — внутрішній, визначити як зручно. Мінімум має містити: поточний рівень, лічильники по рівню, `totalAsked`, історію відповідей.

---

## 🧠 Алгоритм (словами)

**CEFR_LEVELS** = `[A1, A2, A2_PLUS, B1, B1_PLUS, B2, C1, C2]`.

**Старт:** `currentLevelIndex = 1` (A2).

**Головний цикл:**
1. Вибрати випадкове питання поточного рівня, ще не задане.
2. Показати → користувач обирає → зарахувати `correct`.
3. **Після 5 питань цього рівня:**
   - ≥ 4 правильних → перейти на рівень вище, скинути лічильники.
   - ≤ 2 правильних → перейти на рівень нижче, скинути.
   - = 3 → **стабілізувалися** → тест завершено. `level = CEFR_LEVELS[currentLevelIndex]`.
4. Якщо `currentLevelIndex` вийшов за межі → клемп до A1 / C2 і завершити.
5. Якщо `totalAsked >= 25` → примусово завершити.

**Приклад:** Start A2 → 4/5 → B1 → 3/5 → stabilize → **B1**.

---

## 🧪 Тести (6+)

1. `startTest` → index = 1 (A2).
2. 5 правильних на A2 → перехід на A2+ (index 2).
3. 5 неправильних на A2 → перехід на A1 (index 0).
4. 3 правильних + 2 неправильних → стабілізація, тест завершено.
5. 25+ питань → примусове завершення.
6. `getResult` повертає `{ level, correctCount, totalCount }`.

---

## ⚠️ Нюанси

- **Старт з A2** — компроміс.
- **Random вибір питання** — `Math.random` + `askedQuestionIds` (не повторювати).
- **Прогрес-бар** — «X / 25».
- **Не показувати правильний** після вибору.
- **`(dashboard)` route group** — тест захищений middleware (17). Без логіна → `/login`.
- **JSON читається через `fs`**, не через import (інакше бандл роздується). Шлях — через `import.meta.url` + `DATA_DIR` (як у задачі 07).
- **UI (brief):** прогрес-бар → тема (сірим, дрібно) → питання → 4 кнопки-варіанти (повна ширина, hover). Результат — великий заголовок рівня + score + кнопка.

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 9 (CEFR)
- `docs/tasks/16.5-ui-foundation.md`
- `docs/tasks/17-user-helpers.md`
- `AGENT_RULES.md` → розділ 7.1

---

## 💬 Commit message

```
feat(test): add adaptive level test UI

- add data/test_questions.json with 40 questions (5 per level)
- add lib/test/loader.ts to read questions
- add lib/test/adaptive.ts with sequential transition algorithm
- add /test page with TestRunner client component
- add QuestionCard, ProgressBar, TestResult components
- start at A2, 5 questions per level, stabilize at 3/5
- max 25 questions, show result with detected level
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/18-adaptive-test-ui
# ...
git add .
git commit -m "feat(test): add adaptive level test UI"
git push origin feat/18-adaptive-test-ui
```

---

## 📝 Нотатки

- Чи вистачило 5 питань на рівень?
- Чи є питання з кількома правильними?
- Чи треба пояснення після відповіді?