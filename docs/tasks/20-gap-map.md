# 20 — Gap Map

**Епік:** E5 — Level Test
**Розмір:** S (1–2 год)
**Залежності:** 19
**Статус:** ⬜ Todo
**Гілка:** `feat/20-gap-map`

> ⚠️ **ЦЯ ЗАДАЧА — АНАЛІЗ ПРОБІЛІВ ПІСЛЯ ТЕСТУ.**
> Submit готовий (19). Тепер — групування помилок + `UserProgress`.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Dashboard UI (22)
> - Plan generation (21)

---

## 🎯 Мета

Після завершення:
- Submit-endpoint аналізує помилки → групує за темою
- Створює `UserProgress` для слабких тем (status = `NOT_STARTED`)
- Відповідь містить `weakTopics`
- TestResult показує слабкі теми

---

## ✅ Acceptance Criteria

- [ ] `apps/web/lib/test/gap-map.ts` — 2 функції (сигнатури нижче)
- [ ] `apps/web/lib/test/gap-map.test.ts` — 4+ тестів
- [ ] Submit-endpoint викликає `analyzeGaps` + `persistGaps`
- [ ] Відповідь містить `weakTopics: { topic, level, errors }[]`
- [ ] Ідемпотентність: повторний submit не дублює `UserProgress`
- [ ] TestResult показує список слабких тем (або «Гарний результат!»)
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить

- ❌ Dashboard UI (22)
- ❌ Plan generation (21)
- ❌ Оновлення `UserProgress` при вправах (30+)

---

## 📁 Файли

### Створити

- `apps/web/lib/test/gap-map.ts`
- `apps/web/lib/test/gap-map.test.ts`

### Змінити

- `apps/web/app/api/test/submit/route.ts` — виклик
- `apps/web/components/test/test-result.tsx` — показ

### Не чіпати

- `apps/web/lib/test/{adaptive,loader}.ts`
- `apps/web/lib/validation/test.ts`
- `apps/web/lib/ai/**`, `redis/**`, `slots/**`
- `packages/shared/**`

---

## 🔧 Контракти (обов'язково)

### Тип `WeakTopic`

```ts
type WeakTopic = {
  topic: string;
  level: CEFRLevel;
  errors: number;
};
```

### Функції `gap-map.ts`

```ts
analyzeGaps(
  answers: { questionId: string; correct: boolean }[],
  questions: TestQuestion[]
): WeakTopic[]

persistGaps(userId: string, gaps: WeakTopic[]): Promise<void>
```

---

## 🧠 Алгоритм (словами)

### `analyzeGaps`

1. `Map<questionId, TestQuestion>` з `questions`.
2. Пройти по `answers`:
   - `!correct` → додати в `Map<topic, { level, errors }>`.
3. Повернути масив, відсортований за `errors DESC`.

### `persistGaps`

Для кожної теми — `prisma.userProgress.upsert`:
- **Знайти** за `(userId, level, topicName)`.
- **Створити** зі `status: "NOT_STARTED"`, якщо немає.
- **Не оновлювати** статус, якщо вже є.

---

## ⚠️ Критичний нюанс — `@@unique` з nullable полями

**Проблема.** У `UserProgress` (задача 06) є:
```prisma
@@unique([userId, level, topicName, subtopicName, templateId])
```

У Postgres `NULL != NULL`, тому два рядки з `subtopicName = null, templateId = null` **не вважаються конфліктом**. `upsert` не спрацює.

**Рішення (обрати одне):**

**A.** У `persistGaps` писати `subtopicName: ""`, `templateId: ""` (порожній рядок замість null). Швидко, але трохи брудно.

**B.** Додати в `UserProgress` додатковий `@@unique([userId, level, topicName])`. Чистіше, але потребує міграції. Це **окрема chore-задача 20.1**.

**C.** Замість `upsert` — `findFirst` + `create` if not exists. Працює, але race condition (не критично для MVP).

**Рекомендація:** варіант **A** для MVP. Якщо схема розшириться — перейти на **B**.

---

## 🧪 Тести (4+)

1. `analyzeGaps` з 0 помилок → `[]`.
2. `analyzeGaps` з 1 помилкою → `[{ topic, level, errors: 1 }]`.
3. Помилки в одній темі → групує (`errors: 3`).
4. Помилки в різних темах → сортує за `errors DESC`.

---

## 📎 Контекст

- `docs/tasks/19-test-submission-api.md`
- `docs/tasks/06-prisma-schema.md` (модель `UserProgress`)

---

## 💬 Commit message

```
feat(test): add gap map analysis after level test

- add lib/test/gap-map.ts with analyzeGaps and persistGaps
- group wrong answers by topic, create UserProgress entries
- extend /api/test/submit response with weakTopics
- show weak topics in TestResult component
- idempotent via upsert with empty-string subtopic/template
- add 4 unit tests for analyzeGaps
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/20-gap-map
# ...
git add .
git commit -m "feat(test): add gap map analysis after level test"
git push origin feat/20-gap-map
```

---

## 📝 Нотатки

- Який варіант обрано для `@@unique`? (A/B/C)
- Чи треба окрема chore-задача на `@@unique`?
- Чи показувати gap map окремо на dashboard?