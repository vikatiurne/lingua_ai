# 27 — Generate Exercise API

**Епік:** E7 — Exercise
**Розмір:** M (2–3 год)
**Залежності:** 12, 26
**Статус:** ✅ Done (з відхиленням — див. Нотатки)
**Гілка:** `feat/27-generate-exercise-api`

> ⚠️ **ЦЯ ЗАДАЧА — ГЕНЕРАЦІЯ ПРЕДЛОЖЕНИЙ ЧЕРЕЗ AI.**
> Створює API, який бере шаблони, враховує минулі помилки користувача (Error Recycling)
> і просить AI згенерувати унікальні речення для перекладу.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Створення PDF (28)
> - UI виконання (29)

---

## 🎯 Мета

Після завершення:
- Є API `POST /api/exercise/generate`.
- Він приймає параметри: `level`, `topic`, `subtopic`, `ukEnCount`, `enUkCount`.
- Витягує минулі помилки користувача (`UserError`) зі статусом `ACTIVE`.
- Формує промпт для AI з урахуванням шаблонів та помилок.
- Отримує JSON з реченнями (укр → англ і англ → укр).
- Зберігає `Exercise` у БД і повертає `exerciseId` та речення.

---

## ✅ Acceptance Criteria

- [x] Є `apps/web/lib/ai/prompts/generate-exercise.ts` (шаблон промпту).
- [x] Є `apps/web/lib/exercise/generator.ts` (функція `generateExercises`).
- [x] Є API роут `apps/web/app/api/exercise/generate/route.ts` (POST).
- [x] API захищений (`getCurrentUser`), обгорнутий `withRateLimit(RATE_LIMITS.AI)`.
- [x] Функція витягує `UserError` де `status === "ACTIVE"` (до 5 штук).
- [x] Функція витягує шаблони через `loadTemplateFile`, знаходить потрібну тему/підтему і дістає `examples` та `generation_hint`.
- [x] Формується промпт, який передається в `completeWithFallback`.
- [x] AI повертає JSON `{ sentences: [{ source, reference, direction }] }`.
- [x] Робиться валідація через Zod, що AI повернув правильний формат.
- [x] `Exercise` створюється в БД зі `status: "generated"`.
- [x] API повертає `{ exerciseId, sentences, isFallback }`.
- [x] `pnpm typecheck` і `pnpm build` проходять.

---

## 📁 Файли

### Створити
- `apps/web/lib/ai/prompts/generate-exercise.ts`
- `apps/web/lib/exercise/generator.ts`
- `apps/web/app/api/exercise/generate/route.ts`

---

## 🧠 Алгоритм (словами)

### 1. `prompts/generate-exercise.ts`
Функція формування промпту. Отримує:
- `level`, `topic`, `subtopic`
- `ukEnCount`, `enUkCount`
- `examples` (2-3 речення з шаблону)
- `hint` (generation_hint з шаблону)
- `pastErrors` (масив рядків)

Повертає рядок промпту:
> "You are an English teacher. Generate {ukEnCount} Ukrainian sentences to translate to English, and {enUkCount} English sentences to translate to Ukrainian. 
> Topic: {topic} ({subtopic}), Level: {level}.
> Must follow these rules: {hint}.
> Base your style on these examples: {examples}.
> Important: Include these past mistakes/sentences to test the student again: {pastErrors}.
> Return ONLY a valid JSON object in this format: { "sentences": [{ "source": "...", "reference": "...", "direction": "uk_en" }] }"

### 2. `generator.ts`
1. Витягує `pastErrors` з БД (`prisma.userError.findMany` де `status: ACTIVE`).
2. Знаходить шаблон (`loadTemplateFile`).
3. Викликає `getPrompt(...)`.
4. Викликає `completeWithFallback(prompt, { responseFormat: "json", temperature: 0.7 })`.
5. Парсить JSON.
6. Валідує через Zod.
7. Повертає масив речень.

### 3. `route.ts` (POST)
1. `getCurrentUser()` → 401.
2. Zod-валідація вхідних параметрів.
3. `const sentences = await generateExercises(user.id, ...params)`.
4. `prisma.exercise.create({ data: { userId, level, topicName, subtopicName, sentences, status: "generated" } })`.
5. Повернути `{ exerciseId, sentences, isFallback }`.

---

## ⚠️ Нюанси

- **Формат `direction`:** `uk_en` (укр→англ) та `en_uk` (англ→укр) — ISO-код для України, як у Prisma enum `SentenceDirection`.
- **Error Recycling:** якщо в користувача немає помилок (`pastErrors = []`), просто не включаємо цей блок у промпт.
- **Максимум 20 речень** за один запит (щоб не перевищити ліміт токенів).

**Обробка помилок AI (ЗАМІСТЬ ПОВЕРНЕННЯ 500):**
Щоб не показувати користувачу екран помилки 500, зроби наступне:
1. **Self-Correction:** Якщо `JSON.parse` падає, відправ AI ще один запит: "Your previous response was invalid JSON. Error: [error]. Return ONLY valid JSON in the requested format.".
2. **Fallback на examples:** Якщо AI не зміг видати JSON двічі, або якщо взагалі сталася помилка мережі, візьми масив `examples` з відповідного шаблону і віддай як є з напрямом `en_uk` (приклади — англійські речення).
3. **Повертай 200 OK** навіть у разі fallback. Додай у відповідь поле `isFallback: true`.
4. **Логуй ці помилки** через `logger.ts`, щоб ми могли бачити, як часто AI падає.

---

## 💬 Commit message

```
feat(exercise): add AI generation API with error recycling

- add prompt builder for exercise generation
- add generator.ts (reads past errors, templates, calls AI)
- add POST /api/exercise/generate
- validate AI JSON response with Zod
- save Exercise to DB with status "generated"
- return exerciseId
```

---

## 📝 Нотатки

Заповнено після завершення.

- **Формат `direction`: `uk_en` / `en_uk`** (не `ua_en` / `en_ua` з оригінальної задачі). Стандарт ISO для України — `uk`. Значення збігаються з Prisma enum `SentenceDirection`. Zod-схема та промпт оновлені.
- **`status === "ACTIVE"` → `active`** у Prisma (`ErrorRecyclingStatus` — lowercase enum).
- **`templateIds`**: зберігаються id патернів знайденої підтеми (`subtopicEntry.patterns.map(p => p.id)`); для незнайденої теми — `[]`.
- **Self-correction** передає повний контекст: prompt + AI-відповідь + текст помилки (інакше AI не знає, що виправляти).
- **Fallback**: `examples` з шаблону віддаються як є з напрямом `en_uk` (усі приклади — англійські речення).
- **Topic/subtopic не знайдено в шаблоні** → не 404, а `console.warn` + генерація без `hint`/`examples` (AI отримує тільки назву теми).
- **`uaEnCount`/`enUaCount` → `ukEnCount`/`enUkCount` (до задачі 29).** Стандарт ISO для України — `uk`, не `ua`. Zod-схема, генератор і промпт перейменовано. Спільно з задачею 25 (URL-параметри `ukEn`/`enUk`).
- **Відповідь розширено до `{ exerciseId, sentences, isFallback }` (до задачі 29).** UI має рендерити речення одразу після генерації (за форматом `GenerateResponse` з задачі 29): `{ id, source, direction, reference }`. `id` генерується сервером (`crypto.randomUUID()`) і зберігається в БД разом із реченнями; `reference` (еталонний переклад) повертає AI — додано до Zod-схеми та промпту. У fallback `reference: ""`.
- **Формат `direction` в API-відповіді** — `uk_en` / `en_uk` (підкреслення), як і в БД.
- Runtime-перевірка: без логіну → `401`; повний цикл з AI не запускався (потребує ключів `OPENROUTER_*`).