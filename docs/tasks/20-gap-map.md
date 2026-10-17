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
> - Оновлення `UserProgress` при вправах (30+)

---

## 🎯 Мета

Після завершення:
- Submit-endpoint (19) аналізує помилки → групує за темою
- Створює `UserProgress` для слабких тем (status = `NOT_STARTED`)
- Відповідь містить `weakTopics`
- TestResult показує слабкі теми

---

## ✅ Acceptance Criteria

- [ ] `apps/web/lib/test/gap-map.ts` — 2 функції (сигнатури нижче)
- [ ] `apps/web/lib/test/gap-map.test.ts` — 5+ тестів
- [ ] `analyzeGaps` приймає `answers` з полем `skipped: boolean`
- [ ] Відповідь `/api/test/submit` містить `weakTopics: { topic, level, errors, skippedCount }[]`
- [ ] `persistGaps` створює `UserProgress` для кожної слабкої теми (ідемпотентно)
- [ ] TestResult показує список слабких тем (або «Гарний результат!», якщо порожньо)
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить

- ❌ Dashboard UI (22)
- ❌ Plan generation (21)
- ❌ Оновлення `UserProgress` при вправах (30+)
- ❌ Окремий API для gap map (тільки в submit)
- ❌ Історія проходжень

---

## 📁 Файли

### Створити

- `apps/web/lib/test/gap-map.ts`
- `apps/web/lib/test/gap-map.test.ts`

### Змінити

- `apps/web/app/api/test/submit/route.ts` — виклик `analyzeGaps` + `persistGaps`, розширити відповідь
- `apps/web/components/test/test-result.tsx` — показ `weakTopics`
- `apps/web/lib/validation/test.ts` — якщо потрібно, додати `weakTopics` у відповідь (але ні — це серверна відповідь, не запит)

### Не чіпати

- `apps/web/lib/test/{adaptive,loader}.ts`
- `apps/web/lib/ai/**`, `redis/**`, `slots/**`
- `packages/shared/**`

---

## 🔧 Контракти (обов'язково)

### Тип `WeakTopic`

```ts
type WeakTopic = {
  topic: string;
  level: CEFRLevel;
  errors: number;       // скільки неправильних (включно зі skipped)
  skippedCount: number; // скільки з них — skipped (для майбутнього)
};
```

### Функції `gap-map.ts`

```ts
analyzeGaps(
  answers: { questionId: string; correct: boolean; skipped: boolean }[],
  questions: TestQuestion[]
): WeakTopic[]

persistGaps(userId: string, gaps: WeakTopic[]): Promise<void>
```

### Розширена відповідь `/api/test/submit`

```json
{
  "user": { "id": "...", "level": "B1", "targetLevel": "B1_PLUS", ... },
  "correctCount": 12,
  "totalCount": 20,
  "weakTopics": [
    { "topic": "Present Perfect", "level": "A2_PLUS", "errors": 2, "skippedCount": 1 },
    { "topic": "Second Conditional", "level": "B1", "errors": 1, "skippedCount": 0 }
  ]
}
```

**Без `passwordHash`.**

---

## 🧠 Алгоритм (словами)

### `analyzeGaps(answers, questions)`

1. Побудувати `Map<questionId, TestQuestion>` з `questions`.
2. Пройти по `answers`:
   - Знайти питання за `questionId`.
   - Якщо `correct === true` → пропустити.
   - Якщо `correct === false` → додати в `Map<topic, { level, errors, skippedCount }>`:
     - `errors += 1`
     - `skippedCount += skipped ? 1 : 0`
3. Повернути `WeakTopic[]`, відсортований за `errors DESC` (найслабші першими).

**Логіка:** `skipped` і «помилка» обидва свідчать про слабкість. Розділяємо в `skippedCount` для майбутнього аналізу, але для MVP обидва = «слабка тема».

### `persistGaps(userId, gaps)`

Для кожної `gap`:
1. Перевірити, чи існує `UserProgress` з ключем `(userId, level, topicName)`.
2. Якщо ні → створити зі `status: "NOT_STARTED"`, `subtopicName: ""`, `templateId: ""`.
3. Якщо є → **не оновлювати** (не скидати прогрес, якщо учень уже почав цю тему).

**Ідемпотентність:** повторний submit не створює дублів, не скидає існуючий прогрес.

### Оновлення `submit/route.ts`

Після `prisma.user.update`:
1. `questions = await loadTestQuestions()` (з `lib/test/loader.ts`).
2. `gaps = analyzeGaps(parsed.data.answers, questions)`.
3. `await persistGaps(user.id, gaps)`.
4. Повернути `{ user, correctCount, totalCount, weakTopics: gaps }`.

---

## ⚠️ Критичний нюанс — `@@unique` з nullable полями

**Проблема.** У `UserProgress` (задача 06) є:
```prisma
@@unique([userId, level, topicName, subtopicName, templateId])
```

У Postgres `NULL != NULL`, тому два рядки з `subtopicName = null, templateId = null` **не вважаються конфліктом**. `upsert` не спрацює — будуть дублі.

**Рішення — у `persistGaps` писати `""` замість `null`:**

```ts
create({
  userId,
  level: gap.level,
  topicName: gap.topic,
  subtopicName: "",   // ← порожній рядок, не null
  templateId: "",     // ← порожній рядок, не null
  status: "NOT_STARTED",
})
```

Тоді `@@unique` працює: `"" == ""` → конфлікт → `upsert` не створить дубль.

**Перевірка:** після двох submit підряд → у `user_progress` тільки один запис на `(userId, level, topicName)`.

**Альтернатива (чистіша, але потребує міграції):** додати `@@unique([userId, level, topicName])` у схему. Окрема chore-задача 20.1. Для MVP — варіант з `""`.

---

## 🧪 Тести (5+)

### `gap-map.test.ts`

1. **Порожній `answers`** → `[]`.
2. **1 неправильна** → `[{ topic, level, errors: 1, skippedCount: 0 }]`.
3. **3 неправильні в одній темі** → `[{ topic, errors: 3 }]`.
4. **Неправильні в різних темах** → сортує за `errors DESC`.
5. **2 неправильні, з них 1 skipped** → `{ errors: 2, skippedCount: 1 }`.
6. **Всі правильні** → `[]`.

---

## ⚠️ Нюанси

- **`weakTopics` сортувати за `errors DESC`** — найслабші першими.
- **`persistGaps` не скидає існуючий прогрес.** Якщо учень уже почав тему — не перезаписувати `status` і `score`.
- **`subtopicName: ""`, `templateId: ""`** — критично для `@@unique` (див. вище).
- **`skipped` і `errors` разом** — для MVP обидва = слабка тема. У майбутньому `skippedCount` дозволить відрізняти «не знав» від «помилився».
- **TestResult показ:** якщо `weakTopics.length === 0` → «Гарний результат!». Інакше — список тем з кількістю помилок.
- **Не блокувати учня** при помилці `persistGaps` — якщо БД впала, submit все одно повертає 200 з `weakTopics: []` і логує помилку. Основний результат (`User.level`) зберігся.

---

## 📎 Контекст

- `docs/tasks/19-test-submission-api.md`
- `docs/tasks/06-prisma-schema.md` (модель `UserProgress`)
- `docs/tasks/18-adaptive-test-ui.md` (структура `answers`)

---

## 💬 Commit message

```
feat(test): add gap map analysis after level test

- add lib/test/gap-map.ts with analyzeGaps and persistGaps
- group wrong answers by topic (includes skipped)
- extend /api/test/submit response with weakTopics
- show weak topics in TestResult component
- idempotent via empty-string subtopic/template (Postgres @@unique)
- add 6 unit tests for analyzeGaps
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

Заповнюється після завершення.

- Чи правильно вибрано `""` замість `null` для `subtopicName`/`templateId`?
- Чи не створюються дублі при повторному submit?
- Чи правильно `persistGaps` не скидає існуючий прогрес?
- Чи варто окрема chore-задача на `@@unique([userId, level, topicName])`?
- Чи треба показувати gap map окремо на dashboard? (задача 22)