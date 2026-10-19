# 30 — Save Exercise Answers

**Епік:** E8 — Evaluation
**Розмір:** S (1 год)
**Залежності:** 29
**Статус:** ✅ Done
**Гілка:** `feat/30-save-answers`

> ⚠️ **ЦЯ ЗАДАЧА — ЗБЕРЕЖЕННЯ ВІДПОВІДЕЙ У БД.**
> Бере дані з форми, яку ми зробили в Задачі 29, і записує їх у JSON-поле `sentences` в таблиці `Exercise`.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Оцінки через AI (31)

---

## 🎯 Мета

Після завершення:
- Є API `PATCH /api/exercise/[id]/answers`.
- Він приймає масив відповідей від користувача.
- Оновлює `Exercise` в БД, записуючи `userAnswer` до кожного речення.
- Змінює статус `Exercise` на `in_progress` (або залишає `generated`, якщо оцінки ще немає).

---

## ✅ Acceptance Criteria

- [x] Є API роут `app/api/exercise/[id]/answers/route.ts` (PATCH).
- [x] Валідація вхідних даних через Zod.
- [x] Перевірка, що `Exercise` належить поточному користувачу (через `userId`).
- [x] Оновлення поля `sentences` (JSON) у Prisma.
- [x] `pnpm typecheck` і `pnpm build` проходять.

---

## 🔧 Контракти (обов'язково)

### Вхідний формат (від фронтенду)
```ts
type SaveAnswersPayload = {
  answers: {
    sentenceId: string;
    userAnswer: string;
  }[];
};
```

### Zod-схема (у `validation/exercise.ts`)
```ts
import { z } from "zod";

export const saveAnswersSchema = z.object({
  answers: z.array(
    z.object({
      sentenceId: z.string(),
      userAnswer: z.string(), // може бути пустою або містити "..."
    })
  ).min(1),
});
```

---

## 🧠 Алгоритм (словами)

### `route.ts` (PATCH)
1. `getCurrentUser()` → 401.
2. Дістати `id` з `params`.
3. `prisma.exercise.findUnique({ where: { id } })` → перевірити, що `userId === user.id`, інакше 403.
4. `body = await req.json()`, валідація через `saveAnswersSchema`.
5. Дістати поточний масив `sentences` з `exercise.sentences` (як `any[]`).
6. Пройтися по масиву `sentences` і для кожного знайти відповідність у `body.answers` за `id`. Записати `userAnswer`.
7. `prisma.exercise.update({ where: { id }, data: { sentences: updatedSentences } })`.
8. Повернути `{ success: true }`.

---

## 💬 Commit message

```
feat(exercise): add API to save user answers before evaluation

- add PATCH /api/exercise/[id]/answers
- validate payload with Zod
- update Exercise.sentences JSON with userAnswer fields
```