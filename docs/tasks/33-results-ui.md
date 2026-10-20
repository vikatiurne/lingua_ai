# 33 — Results UI (Error Breakdown)

**Епік:** E8 — Evaluation
**Розмір:** M (2–3 год)
**Залежності:** 29, 31
**Статус:** ✅ Done
**Гілка:** `feat/33-results-ui`

> ⚠️ **ЦЯ ЗАДАЧА — ЕКРАН РЕЗУЛЬТАТІВ ПІСЛЯ ОЦІНКИ.**
> Показує дві оцінки (Topic & Grammar), список усіх речень (правильні/неправильні) з поясненнями.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Роботи над помилками (34)
> - Експорту в Quizlet (35)

---

## 🎯 Мета

Після завершення:
- Сторінка `/exercise/[id]/result` показує результати.
- Дві великі оцінки (Topic Score та Grammar Score).
- Список речень із кольоровим кодуванням (зелений = правильно, червоний = помилка).
- Для неправильних речень виводиться текст помилки від AI (поле `explanation`).
- Якщо є пропущені слова, показується блок "Слова для вивчення" (з `vocabularyToAdd`).

---

## ✅ Acceptance Criteria

- [x] Є сторінка `app/(dashboard)/exercise/[id]/result/page.tsx` (Server Component).
- [x] Сторінка дістає `Exercise` з БД (перевіряє `userId`).
- [x] Якщо статус не `evaluated` → редірект на `/exercise/app` або 404.
- [x] Рендерить компонент `ResultCard` з оцінками.
- [x] Рендерить компонент `SentenceReviewList` (список речень).
- [x] Правильні речення виділяються зеленим кольором та іконкою `CheckCircle2`.
- [x] Неправильні речення виділяються червоним (або акцентним) кольором та іконкою `XCircle`.
- [x] Під неправильним реченням виводиться `userAnswer` (перекреслений) та `reference` (правильний).
- [x] Під ними виводиться текст `explanation` від AI.
- [x] `pnpm typecheck` і `pnpm build` проходять.

---

## 🔧 Хрупкі місця (обов'язково)

### 1. Формат даних у БД (після Задачі 31)
Поле `Exercise.sentences` (JSON) має таку структуру:
```ts
type EvaluatedSentence = {
  id: string;
  source: string;
  direction: "uk_en" | "en_uk";
  reference: string;
  userAnswer: string;
  isCorrect: boolean;
  errorType?: string;
  explanation?: string;
  vocabularyToAdd?: { word: string; translation: string };
};
```

### 2. Компоненти
- `components/exercise/result-card.tsx` — відображення `topicScore` та `grammarScore`. (Можна використати кільцевий прогрес або просто великі цифри).
- `components/exercise/sentence-review-list.tsx` — рендерить масив `EvaluatedSentence[]`.
- `components/exercise/sentence-review-card.tsx` — картка одного речення.

---

## 🧠 Алгоритм (словами)

1. **Сторінка `page.tsx`**:
   - Отримує `id` з `params`.
   - Робить `prisma.exercise.findFirst({ where: { id, userId: user.id } })`.
   - Передає `exercise.sentences` та оцінки в клієнтські компоненти.

2. **`ResultCard`**:
   - Показує `Topic Score: {topicScore}%` та `Grammar Score: {grammarScore}%`.
   - Додає візуальне забарвлення (наприклад, якщо > 80% — зелений, якщо < 50% — червоний).

3. **`SentenceReviewCard`**:
   - Якщо `isCorrect === true` → зелена рамка, галочка.
   - Якщо `isCorrect === false` → червона рамка.
     - Показує: `Ваш переклад: {userAnswer}` (з `line-through`).
     - Показує: `Правильно: {reference}` (жирним).
     - Показує: `Пояснення: {explanation}` (у блоці `bg-muted`).
     - Якщо є `vocabularyToAdd`, показує бейдж `Word: {word} - {translation}`.

---

## ⚠️ Нюанси

- **Серверний компонент:** Сторінка має бути Server Component. Дані беремо напряму з Prisma. Клієнтські компоненти (`ResultCard`, `SentenceReviewCard`) робимо тільки там, де потрібна інтерактивність (наприклад, кнопки копіювання).
- **Безпека:** Обов'язково перевіряйте `userId` при запиті до БД, щоб користувач не міг підглянути чужі результати.
- **Кнопки дій:** Внизу сторінки додайте кнопку «Повернутися до плану» (веде на `/plan`) та заглушку «Робота над помилками» (буде в Задачі 34).

---

## 💬 Commit message

```
feat(exercise): add results UI with scores and sentence breakdown

- add /exercise/[id]/result page
- fetch evaluated exercise from DB
- create ResultCard to display topic and grammar scores
- create SentenceReviewList and SentenceReviewCard for visual feedback
- highlight correct sentences in green, incorrect in red
- show AI explanation and vocabularyToAdd badges
```