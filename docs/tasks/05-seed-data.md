# 04 — Seed Data (Levels, Topics, Subtopics)

**Епік:** E1 — Foundation
**Розмір:** M (2–3 год)
**Залежності:** 03
**Статус:** ⬜ Todo
**Гілка:** `feat/04-seed-data`

> ⚠️ **ЦЯ ЗАДАЧА НАПОВНЮЄ STRAPI ДАНИМИ.**
> Content-types вже створені (задача 03). Наповнюємо:
> 8 Levels + Topics + Subtopics з `data/templates_*.json`.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - `apps/web/**`, `packages/shared/**`
> - JSON-файли `data/**` — читаємо, не змінюємо
> - Prisma (задача 06)
> - CuratedMaterial (задача 38)

---

## 🎯 Мета

Strapi містить 8 Levels + Topics + Subtopics. Скрипт `scripts/seed.ts` ідемпотентний (повторний запуск не створює дублів).

---

## ✅ Acceptance Criteria

- [ ] Є `scripts/seed.ts`, `scripts/lib/strapi-client.ts`, `scripts/lib/parse-templates.ts`
- [ ] Є команда `pnpm seed` у корені
- [ ] Скрипт читає 8 файлів `data/templates_*.json`
- [ ] Скрипт створює 8 Levels, Topics, Subtopics
- [ ] Ідемпотентний: повторний запуск → тільки "already exists" у логах
- [ ] `curl /api/levels` → 8 записів
- [ ] `curl /api/topics` → 40+
- [ ] `curl /api/subtopics` → 100+
- [ ] `docker compose logs strapi --tail=50` без помилок

---

## 🚫 Що НЕ входить (out of scope)

- ❌ CuratedMaterial seed (задача 38)
- ❌ Users seed (задачі 15–17)
- ❌ Prisma seed (задача 06)

---

## 📁 Файли

### Створити
- `scripts/seed.ts`
- `scripts/lib/strapi-client.ts`
- `scripts/lib/parse-templates.ts`

### Змінити
- `package.json` (корінь) — додати `"seed": "tsx scripts/seed.ts"` і `devDependencies: { tsx, dotenv }`
- `.env.example` — додати `STRAPI_API_TOKEN=your_token_here`

---

## 🔧 Хрупкі місця (обов'язково)

### Мапінг рівнів → файли (у `parse-templates.ts`)

```ts
import { CEFR_LEVEL, type CEFRLevel, LEVEL_META } from "@lingua/shared";
import { parseAllTemplates } from "./lib/parse-templates.js";

const LEVEL_FILES: Record<CEFRLevel, string> = {
  [CEFR_LEVEL.A1]: "templates_a1.json",
  [CEFR_LEVEL.A2]: "templates_a2.json",
  [CEFR_LEVEL.A2_PLUS]: "templates_a2_plus.json",
  [CEFR_LEVEL.B1]: "templates_b1_advanced.json", // historically named "advanced"
  [CEFR_LEVEL.B1_PLUS]: "templates_b1_plus.json",
  [CEFR_LEVEL.B2]: "templates_b2.json",
  [CEFR_LEVEL.C1]: "templates_c1.json",
  [CEFR_LEVEL.C2]: "templates_c2.json",
};

```

### Парсинг `templates_*.json`

Структура файлу:
```json
{
  "level": "A1",
  "topics": [
    { "topic": "Present Simple", "subtopics": [ { "name": "Affirmative" }, ... ] }
  ]
}
```

Треба витягнути: `topics[].topic` → name, `topics[].subtopics[].name` → subtopic name.

---

## 🧠 Алгоритм (словами)

**`parseAllTemplates(dataDir = "data")`:**
1. Для кожного рівня з `LEVEL_FILES`:
   - Прочитати файл з `<dataDir>/<filename>`.
   - `JSON.parse`.
   - Витягнути `{ level, topics: [{ name, subtopics: [{ name }] }] }`.
2. Повернути масив із 8 елементів.

**`strapiRequest(path, options)`:**
1. Додати `Authorization: Bearer ${STRAPI_API_TOKEN}`.
2. `Content-Type: application/json`.
3. `fetch(`${STRAPI_URL}/api${path}`, ...)`.
4. Якщо `!response.ok` → кинути помилку з тілом відповіді.

**`findOne(collection, filters)`:**
1. `GET /<collection>?filters=<JSON.stringify(filters)>`.
2. Повернути `data[0] ?? null`.

**`create(collection, data)`:**
1. `POST /<collection>` з тілом `{ data }`.
2. Повернути `result.data`.

**`seedLevels()`:**
1. Для кожного `(code, meta)` з `LEVEL_META`:
   - `findOne("levels", { code: { $eq: code } })`.
   - Якщо є — log "exists", додати в Map.
   - Якщо немає — `create`, log "created", додати в Map.
2. Повернути `Map<code, Level>`.

**`seedTopicsAndSubtopics(levels)`:**
1. `parseAllTemplates()`.
2. Для кожного файлу:
   - Знайти `level` у Map.
   - Для кожного topic:
     - `findOne("topics", { name, level: { id: level.id } })`.
     - Якщо немає — `create({ name, order, level: level.id })`.
   - Для кожного subtopic:
     - `findOne("subtopics", { name, topic: { id: topic.id } })`.
     - Якщо немає — `create({ name, order, topic: topic.id })`.

**`main()`:** послідовно `seedLevels()` → `seedTopicsAndSubtopics()`.

---

## 🔬 Приклади

```
pnpm seed

# Вивід:
[level] created A1 (id=1)
[level] created A2 (id=2)
...
[topic] A1 / Verb to be (am/is/are) created (id=1)
  [subtopic] Affirmative created (id=1)
  [subtopic] Negative created (id=2)
...

# Другий запуск:
[level] A1 already exists (id=1)
[topic] A1 / Verb to be (am/is/are) exists (id=1)
  [subtopic] Affirmative exists (id=1)
```

---

## ⚠️ Нюанси

- **`STRAPI_API_TOKEN`** — створити в Admin: Settings → API Tokens → Full access. Записати в `.env`.
- **Формат запиту** — Strapi 5 очікує `{ data: {...} }` (не голий об'єкт).
- **Relation** — передається як `level: <id>` (число), не об'єкт.
- **Ідемпотентність** — обов'язкова. Завжди `findOne` перед `create`.
- **Порядок** — Levels спочатку (бо Topics залежать від них).
- **`order`** — інкремент у межах батька (topic order у межах level; subtopic order у межах topic).

---

## 📝 README

Після завершення задачі — оновити `README.md`:
- [ ] Пункт «X» у «📊 Статус проєкту» → `[x]`
- [ ] (якщо UI) Додати скриншот в «📸 Скриншоти»
- [ ] (якщо deploy) Додати live URL в «🚀 Демо»

## 🧪 Як перевірити

```bash
cp .env.example .env
# Заповнити STRAPI_API_TOKEN
pnpm install
pnpm seed
curl http://localhost:1337/api/levels      # 8 записів
curl http://localhost:1337/api/topics      # 40+
curl http://localhost:1337/api/subtopics   # 100+
pnpm seed                                  # idempotent: no new entries
```

---

## 📎 Контекст
- `00_CONTEXT.md` → розділи 4, 9, 10
- `docs/tasks/03-strapi-content-types.md`

---

## 💬 Commit message
```
feat(seed): populate Strapi with levels, topics, subtopics

- add scripts/seed.ts (idempotent)
- add scripts/lib/strapi-client.ts
- add scripts/lib/parse-templates.ts with LEVEL_FILES and LEVEL_META
- add pnpm seed script and tsx dependency
- add STRAPI_API_TOKEN to .env.example
```

---

## 🔀 Git workflow
```bash
git checkout -b feat/04-seed-data
# ...
git add .
git commit -m "feat(seed): populate Strapi with levels, topics, subtopics"
git push origin feat/04-seed-data
```