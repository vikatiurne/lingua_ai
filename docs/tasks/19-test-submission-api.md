# 19 — Test Submission API

**Епік:** E5 — Level Test
**Розмір:** S (1–2 год)
**Залежності:** 18
**Статус:** ✅ Done
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

- [x] `apps/web/app/api/test/submit/route.ts`
- [x] `apps/web/lib/validation/test.ts` — Zod-схема
- [x] `apps/web/lib/validation/test.test.ts` — 4+ тестів
- [x] Endpoint захищений (`getCurrentUser`) — 401 якщо немає сесії
- [x] Обгорнутий `withRateLimit(RATE_LIMITS.API)`
- [x] Оновлює `User.level` + `User.targetLevel` (наступний рівень, для C2 → C2)
- [x] Повертає `{ user, correctCount, totalCount }`
- [x] TestRunner викликає API, показує loading
- [x] Після успіху → `router.push("/dashboard")`
- [x] `pnpm typecheck` і `pnpm --filter web test` проходять

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

**Статус:** завершено. `pnpm typecheck`, `pnpm --filter web build`, `pnpm --filter web test` — зелені
(6 нових тестів у `test.test.ts`, всього 127).

### Відповіді на питання

- **Чи правильно визначається `targetLevel` для C2?**
  Так. `targetLevel = CEFR_LEVELS[indexOf(level) + 1] ?? level`. Для `C2` (індекс 7)
  `CEFR_LEVELS[8]` — `undefined`, тому fallback повертає сам `C2`. Для решти рівнів —
  наступний у `CEFR_LEVELS`.
- **Чи треба серверна валідація `correct`?**
  Для MVP — ні. Клієнтський `correct` не впливає на безпеку (учень шкодить лише собі),
  а серверна перевірка вимагала б доставки `correctIndex` на клієнт і повторної
  валідації питань. `correctCount`/`correct` лише пишуться у відповідь і надалі
  вплинуть на gap map (20). Винесено в беклог.
- **Чи треба зберігати історію проходжень?**
  Ні, out of scope. `User.level` перезаписується при повторному проходженні, окремої
  таблиці історії немає (окрема задача, якщо знадобиться analytics).

### Нюанс

`router.push("/dashboard")` веде на сторінку, якої ще немає — її створює задача 22.
На момент 19 редірект коректний, але дасть 404 до реалізації dashboard.

### README не змінювався

Жоден пункт статусу не завершено: це backend-задача (submit level-тесту).