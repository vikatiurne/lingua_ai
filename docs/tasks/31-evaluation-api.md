# 31 — Evaluation API

**Епік:** E8 — Evaluation
**Розмір:** M (2–3 год)
**Залежності:** 30
**Статус:** ✅ Done
**Гілка:** `feat/31-evaluation-api`

> ⚠️ **ЦЯ ЗАДАЧА — ОЦІНКА ВІДПОВІДЕЙ ЧЕРЕЗ AI.**
> Бере речення, еталонну відповідь та відповідь користувача, і просить AI знайти помилки.

---

## 🎯 Мета

Після завершення:
- Є API `POST /api/exercise/[id]/evaluate`.
- Він витягує речення з відповідями користувача з БД.
- Формує промпт для AI з еталоном та відповіддю користувача.
- Отримує JSON з оцінками (Topic Score, Grammar Score) та розбором помилок.
- Оновлює `Exercise` в БД, зберігаючи оцінки та статус `evaluated`.

---

## ✅ Acceptance Criteria

- [x] Є `apps/web/lib/ai/prompts/evaluate-answers.ts`.
- [x] Є `apps/web/lib/exercise/evaluator.ts`.
- [x] Є API роут `app/api/exercise/[id]/evaluate/route.ts` (POST).
- [x] Обгорнутий `withRateLimit(RATE_LIMITS.AI)`.
- [x] AI аналізує кожне речення окремо.
- [x] Обробляється пропущене слово (`...`).
- [x] Зберігає `topicScore`, `grammarScore` та сам розбір у БД.
- [x] `pnpm typecheck` і `pnpm build` проходять.

---

## 🔧 Контракти (обов'язково)

### Промпт для AI (`evaluate-answers.ts`)
AI має отримати масив об'єктів:
```json
[
  {
    "id": "1",
    "source": "Я живу в Києві.",
    "reference": "I live in Kyiv.",
    "userAnswer": "I lives in Kyiv."
  },
  {
    "id": "2",
    "source": "He reads a book.",
    "reference": "Він читає книгу.",
    "userAnswer": "..."
  }
]
```

**Що має повернути AI (JSON):**
```json
{
  "topicScore": 80,
  "grammarScore": 90,
  "evaluatedSentences": [
    {
      "id": "1",
      "isCorrect": false,
      "errorType": "grammar", 
      "explanation": "У 3-й особі однини (he/she/it) дієслово live отримує закінчення -s. Правильно: lives."
    },
    {
      "id": "2",
      "isCorrect": false,
      "errorType": "skipped",
      "explanation": "Ви не знали переклад. Слово 'read' додано у ваш список для вивчення.",
      "vocabularyToAdd": { "word": "read", "translation": "читати" }
    }
  ]
}
```

---

## 🧠 Алгоритм (словами)

### `evaluator.ts`
1. Дістати `Exercise` з БД (де є `userAnswer`).
2. Перевірити, чи є незаповнені поля. Якщо так — замінити на `...`.
3. Викликати промпт, передавши масив речень (source, reference, userAnswer).
4. Отримати JSON.
5. Валідувати через Zod.
6. Оновити `Exercise`: записати `topicScore`, `grammarScore`, змінити статус на `evaluated`.
7. (Опційно) Створити записи `UserError` для неправильних речень.
8. Повернути результат на фронтенд.

---

## ⚠️ Нюанси

- **Обробка `...`**: Якщо AI бачить `...`, він має розуміти, що користувач пропустив слово. У полі `explanation` він має вказати правильний переклад і виділити `vocabularyToAdd`.
- **Оцінки**: `topicScore` — це відсоток правильних відповідей саме на цю тему. `grammarScore` — загальна грамотність (може бути вищим або нижчим).
- **Rate Limit**: Оцінка може бути важкою для AI, тому 8-10 секунд таймауту цілком достатньо.
- **Помилки**: Якщо AI падає, повертаємо 500 (тут вже не можна робити fallback, бо ми не можемо вигадати оцінку).

---

## 💬 Commit message

```
feat(exercise): add AI evaluation for user answers

- add prompt to evaluate translations and return scores
- add evaluator.ts to process DB exercise and call AI
- add POST /api/exercise/[id]/evaluate
- handle skipped words '...' with vocabularyToAdd
- save topicScore, grammarScore and status 'evaluated'
```

---

## 📝 Нотатки

**Статус:** завершено. `pnpm typecheck`, `pnpm build`, `pnpm --filter web test` (158 тестів) — зелені.

### Розбір зберігається у двох місцях

- **`Exercise.sentences` (JSON)** — до кожного речення додаються `isCorrect`, `errorType`, `explanation`, `vocabularyToAdd`, а порожні `userAnswer` нормалізуються в `...`. Це «знімок» вправи для UI (задача 33).
- **`UserError`** — створюються лише для неправильних речень (для аналітики та Error Recycling). Перед створенням виконується `deleteMany({ where: { exerciseId } })`, щоб повторна перевірка не дублювала помилки. Усі операції запису — в одній `prisma.$transaction`.

### Мапінг типів помилок

AI повертає `topic | grammar | skipped | none`, а Prisma `ErrorType` — лише `topic | general`:

- `topic` → `topic`
- `grammar` → `general`
- `skipped` → `general`
- `none` → не створюється (речення правильне)

Для `skipped` з `vocabularyToAdd` слово й переклад пишуться в `UserError.word` / `UserError.translation`.

### Оцінки та прогалини

- `evaluator.ts` перевіряє, що AI повернув оцінку для **кожного** `id`; якщо ні — помилка → 500.
- Відповідь AI валідується через Zod (`topicScore`/`grammarScore` — 0–100, `explanation` — непорожній рядок).
- Схема БД не змінювалася: `topicScore`, `grammarScore`, `status` уже існували. `completedAt` не заповнюється (не вимагалося задачею).
- Оцінка викликається через `completeCached` з `cacheTtlSeconds: 0` — користувач завжди отримує свіжий розбір, навіть при повторному натисканні «Перевірити».
- Fallback на вигадану оцінку відсутній: якщо всі AI-провайдери або парсинг впали — 500.

### `withRateLimit` і динамічні маршрути

Існуючий `withRateLimit` приймав лише `(req)`, тому `params.id` губився. Він розширений до generic `(req, ...args)`, що зберігає зворотну сумісність з іншими роутами (`generate`, `plan/generate`). `withRateLimit(evaluateHandler, RATE_LIMITS.AI)` тепер коректно прокидає `{ params }`.

### Runtime

Повний цикл з реальним AI не перевірявся (потрібні ключі `OPENROUTER_*`/`GEMINI_*`/`DEEPSEEK_*` та запущена БД). Перевірено: typecheck, production build (маршрут `/api/exercise/[id]/evaluate` присутній), юніт-тести.

### README не змінювався

Пункт «Оцінювання і розбір помилок» ще не завершений — попереду задачі 32–33.
