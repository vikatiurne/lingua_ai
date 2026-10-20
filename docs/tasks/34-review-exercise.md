# 34 — Review Exercise (Робота над помилками)

**Епік:** E8 — Evaluation
**Розмір:** M (2–3 год)
**Залежності:** 27, 31, 33
**Статус:** ⬜ Todo
**Гілка:** `feat/34-review-exercise`

> ⚠️ **ЦЯ ЗАДАЧА — ГЕНЕРАЦІЯ ВПРАВИ НА ОСНОВІ ПОМИЛОК.**
> Кнопка «Work on Mistakes» на екрані результатів має створювати нову вправу.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Експорту в Quizlet (37)
> - Загального дашборду прогресу (43)
> - Глобального пулу помилок (Error Recycling з різних вправ)

---

## 🎯 Мета

Після завершення:
- Кнопка «Work on Mistakes» на сторінці `/exercise/[id]/result` стає активною (якщо є помилки).
- При натисканні створюється нова вправа (Exercise), яка містить **тільки ті речення, де користувач помилився**.
- Користувач редіректиться на сторінку цієї нової вправи `/exercise/[newId]`.

---

## ✅ Acceptance Criteria

- [ ] Кнопка «Work on Mistakes» на сторінці результатів підключена до API.
- [ ] Створено API ендпоінт `POST /api/exercise/[id]/review`.
- [ ] Ендпоінт перевіряє, чи належить вправа користувачу (`userId`) і чи має вона статус `evaluated`.
- [ ] Ендпоінт бере масив `sentences` з оригінальної вправи, фільтрує ті, де `isCorrect === false`.
- [ ] Якщо помилок немає — повертає 400 Bad Request.
- [ ] Створюється новий запис `Exercise` у БД:
  - `topicId` та `subtopicId` — ті самі.
  - `sentences` — відфільтровані речення (тільки `source` та `reference`, без `userAnswer`, `isCorrect`, `explanation`).
  - `status` — `in_progress`.
- [ ] Після створення клієнт редіректить на `/exercise/[newId]`.
- [ ] Кнопка має стан завантаження (`Loader2`), щоб уникнути подвійного кліку.
- [ ] `pnpm typecheck` і `pnpm build` проходять.

---

## 🔧 Хрупкі місця (обов'язково)

### 1. Структура даних (Очищення)
При створенні нової вправи важливо **очистити** старі відповіді користувача. Нові речення мають виглядати так:
```ts
type ReviewSentence = {
  id: string; // новий id (наприклад, crypto.randomUUID())
  source: string;
  direction: "uk_en" | "en_uk";
  reference: string;
  // userAnswer, isCorrect, explanation — відсутні!
};
2. Компонент кнопки
Кнопка має бути на сторінці /exercise/[id]/result.

Якщо всі відповіді правильні (isCorrect === true для всіх), кнопка має бути disabled і мати текст "No mistakes to review".

🧠 Алгоритм (словами)
Клієнт (Сторінка результатів):

Знаходить кнопку «Work on Mistakes».

Додає обробник події: fetch('/api/exercise/[id]/review', { method: 'POST' }).

При успішній відповіді (200) — router.push('/exercise/' + data.newId).

Сервер (API Route):

Отримує id з params.

Робить prisma.exercise.findFirst({ where: { id, userId: user.id } }).

Перевіряє, чи є sentences з isCorrect === false.

Якщо ні — повертає 400.

Якщо так — мапить відфільтровані речення (генеруючи новий id).

Створює новий Exercise через prisma.exercise.create().

Повертає { newId: newExercise.id }.

⚠️ Нюанси
AI не потрібен: Ми не генеруємо нові речення через AI, ми просто беремо ті самі source та reference, які вже є в базі. Це швидко і безкоштовно.

Безпека: Обов'язково перевіряй userId при запиті до БД, щоб користувач не міг створити review-вправу для чужої сесії.

Генерація ID: При створенні нового масиву sentences для нової вправи, обов'язково згенеруй нові id для кожного речення, щоб уникнути конфліктів (наприклад, через crypto.randomUUID()).

💬 Commit message
text
feat(exercise): add review exercise generation from mistakes

- add POST /api/exercise/[id]/review endpoint
- filter incorrect sentences, clean user answers, and generate new IDs
- create a new exercise with in_progress status
- add ReviewButton client component with loading state and redirect
- disable review button if there are no mistakes