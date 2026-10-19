# 31 — Evaluation API

**Епік:** E8 — Evaluation
**Розмір:** M (2–3 год)
**Залежності:** 30
**Статус:** ⬜ Todo
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

- [ ] Є `apps/web/lib/ai/prompts/evaluate-answers.ts`.
- [ ] Є `apps/web/lib/exercise/evaluator.ts`.
- [ ] Є API роут `app/api/exercise/[id]/evaluate/route.ts` (POST).
- [ ] Обгорнутий `withRateLimit(RATE_LIMITS.AI)`.
- [ ] AI аналізує кожне речення окремо.
- [ ] Обробляється пропущене слово (`...`).
- [ ] Зберігає `topicScore`, `grammarScore` та сам розбір у БД.
- [ ] `pnpm typecheck` і `pnpm build` проходять.

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