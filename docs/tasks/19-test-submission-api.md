# 19 — Test Submission API

**Епік:** E5 — Level Test
**Розмір:** S (1–2 год)
**Залежності:** 18
**Статус:** ⬜ Todo
**Гілка:** `feat/19-test-submission-api`

> ⚠️ **ЦЯ ЗАДАЧА — ЗБЕРЕЖЕННЯ РЕЗУЛЬТАТУ ТЕСТУ.**
> UI готовий (18). Тепер — submit на сервер.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Gap map (20)
> - Dashboard (22)
> - Перерахунок при зміні (44)

---

## 🎯 Мета

Після завершення:
- `POST /api/test/submit` — валідує, зберігає `User.level`
- TestRunner викликає API після завершення
- Після успіху → `/dashboard`

---

## ✅ Acceptance Criteria

- [ ] `apps/web/app/api/test/submit/route.ts`
- [ ] `apps/web/lib/validation/test.ts` — Zod-схема
- [ ] `apps/web/lib/validation/test.test.ts` — 4+ тестів
- [ ] Endpoint захищений (`getCurrentUser`) — 401 якщо немає сесії
- [ ] Обгорнутий `withRateLimit(RATE_LIMITS.API)`
- [ ] Оновлює `User.level` + `User.targetLevel` (наступний рівень, для C2 → C2)
- [ ] Повертає `{ user, correctCount, totalCount }`
- [ ] TestRunner викликає API, показує loading
- [ ] Після успіху → `router.push("/dashboard")`
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить

- ❌ Gap map (20)
- ❌ Історія проходжень
- ❌ Analytics
- ❌ Retake logic
- ❌ **Серверна валідація `correct`** — довіряємо клієнту (не критично, учень сам собі робить гірше)

---

## 📁 Файли

### Створити

- `apps/web/lib/validation/test.ts`
- `apps/web/lib/validation/test.test.ts`
- `apps/web/app/api/test/submit/route.ts`

### Змінити

- `apps/web/components/test/test-runner.tsx` — submit
- `apps/web/components/test/test-result.tsx` — loading

### Не чіпати

- `apps/web/lib/test/**` (тільки імпорт)
- `apps/web/lib/ai/**`, `redis/**`, `slots/**`
- `packages/shared/**`

---

## 🔧 Контракти (обов'язково)

### Zod-схема `testSubmissionSchema` (у `validation/test.ts`)

Поля:
- `level: CEFRLevel` (enum з `CEFR_LEVELS`)
- `answers: { questionId: string, correct: boolean }[]` — min 5, max 30
- `correctCount: number` (int, min 0)
- `totalCount: number` (int, min 5, max 30)

### Формат запиту

```json
{
  "level": "B1",
  "answers": [
    { "questionId": "a2_01", "correct": true },
    ...
  ],
  "correctCount": 12,
  "totalCount": 20
}
```

### Формат відповіді 200

```json
{
  "user": { "id": "...", "email": "...", "level": "B1", "targetLevel": "B1_PLUS", ... },
  "correctCount": 12,
  "totalCount": 20
}
```

**Без `passwordHash`.**

---

## 🧠 Алгоритм (словами)

1. `getCurrentUser()` → 401 якщо null.
2. Parse + Zod validate → 400 якщо fail.
3. `targetLevel` = наступний рівень у `CEFR_LEVELS` після `level`. Для C2 → C2.
4. `prisma.user.update` → `{ level, targetLevel }`.
5. Видалити `passwordHash` з відповіді.
6. Повернути 200.

---

## 🧪 Тести (4+)

1. Валідний body → success.
2. Невалідний `level` → fail.
3. Порожній `answers` → fail.
4. `answers.length > 30` → fail.

---

## ⚠️ Нюанси

- **`withRateLimit(RATE_LIMITS.API)`** — 100/мин.
- **`targetLevel`** — следующий из `CEFR_LEVELS`. Для C2 — C2.
- **Повторне проходження** — `level` перезапишется.
- **В бэклог:** server-side validation `correct` (не критично для MVP).

---

## 📎 Контекст

- `docs/tasks/14-rate-limiting.md`
- `docs/tasks/17-user-helpers.md`
- `docs/tasks/18-adaptive-test-ui.md`

---

## 💬 Commit message

```
feat(test): add submission API to save user level

- add validation/test.ts with Zod schema
- add /api/test/submit endpoint (protected, rate-limited)
- update User.level and User.targetLevel on submit
- wire TestRunner to call API after test completion
- redirect to /dashboard on success
- add 4 unit tests for validation
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/19-test-submission-api
# ...
git add .
git commit -m "feat(test): add submission API to save user level"
git push origin feat/19-test-submission-api
```

---

## 📝 Нотатки

- Чи правильно визначається `targetLevel` для C2?
- Чи треба серверна валідація `correct`?
- Чи треба зберігати історію проходжень?