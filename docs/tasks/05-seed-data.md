# 05 — Seed Data (Levels, Topics, Subtopics)

**Епік:** E1 — Foundation
**Розмір:** M (2–3 год)
**Залежності:** 03, 04
**Статус:** ✅ Done
**Гілка:** `feat/05-seed-data`

> ⚠️ **ЦЯ ЗАДАЧА НАПОВНЮЄ STRAPI ДАНИМИ.**
> Content-types вже створені (задача 03). `@lingua/shared` містить `LEVEL_META` (задача 04). Наповнюємо:
> 8 Levels + Topics + Subtopics з `data/templates_*.json`.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - `apps/web/**`
> - `packages/shared/**` — читаємо `LEVEL_META`, не змінюємо
> - JSON-файли `data/**` — читаємо, не змінюємо
> - Prisma (задача 06)
> - CuratedMaterial (задача 38)

---

## 🎯 Мета

Strapi містить 8 Levels + Topics + Subtopics.
Скрипт `scripts/seed.ts` ідемпотентний (повторний запуск не створює дублів).

---

## ✅ Acceptance Criteria

- [ ] Є `scripts/seed.ts`, `scripts/lib/strapi-client.ts`, `scripts/lib/parse-templates.ts`
- [ ] Є команда `pnpm seed` у корені
- [ ] Скрипт читає 8 файлів `data/templates_*.json`
- [ ] Скрипт створює 8 Levels (з `LEVEL_META` у `@lingua/shared`)
- [ ] Скрипт створює Topics і Subtopics для кожного рівня
- [ ] Ідемпотентний: повторний запуск → тільки "already exists" у логах
- [ ] `docker compose exec strapi wget -qO- http://localhost:1337/api/levels` → 8 записів (з токеном)
- [ ] Кількість Topics ≥ 40, Subtopics ≥ 100
- [ ] `docker compose logs strapi --tail=50` без помилок
- [ ] `pnpm typecheck` проходить

---

## 🚫 Що НЕ входить (out of scope)

- ❌ CuratedMaterial seed (задача 38)
- ❌ Users seed (задачі 15–17)
- ❌ Prisma seed (задача 06)
- ❌ `LEVEL_META` у `parse-templates.ts` — він тепер у `@lingua/shared`

---

## 📁 Файли

### Створити
- `scripts/seed.ts`
- `scripts/lib/strapi-client.ts`
- `scripts/lib/parse-templates.ts`

### Змінити
- `package.json` (корінь) — додати:
  ```json
  {
    "scripts": {
      "seed": "tsx scripts/seed.ts"
    },
    "devDependencies": {
      "tsx": "^4.0.0",
      "dotenv": "^16.4.0"
    }
  }
  ```
- `.env.example` — додати:
  ```
  STRAPI_API_TOKEN=your_token_here
  ```

### Не чіпати
- `packages/shared/**` — тільки імпортуємо
- `apps/cms/**` — Strapi працює сам

---

## 🔧 Хрупкі місця (обов'язково)

### `scripts/lib/parse-templates.ts` — повний вміст

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CEFR_LEVEL, type CEFRLevel } from "@lingua/shared";

export type ParsedSubtopic = {
  name: string;
};

export type ParsedTopic = {
  name: string;
  subtopics: ParsedSubtopic[];
};

export type ParsedTemplateFile = {
  level: CEFRLevel;
  topics: ParsedTopic[];
};

export const LEVEL_FILES: Record<CEFRLevel, string> = {
  [CEFR_LEVEL.A1]: "templates_a1.json",
  [CEFR_LEVEL.A2]: "templates_a2.json",
  [CEFR_LEVEL.A2_PLUS]: "templates_a2_plus.json",
  [CEFR_LEVEL.B1]: "templates_b1_advanced.json", // historically named "advanced"
  [CEFR_LEVEL.B1_PLUS]: "templates_b1_plus.json",
  [CEFR_LEVEL.B2]: "templates_b2.json",
  [CEFR_LEVEL.C1]: "templates_c1.json",
  [CEFR_LEVEL.C2]: "templates_c2.json",
};

export async function parseAllTemplates(
  dataDir = "data"
): Promise<ParsedTemplateFile[]> {
  const result: ParsedTemplateFile[] = [];

  for (const [level, filename] of Object.entries(LEVEL_FILES)) {
    const path = join(dataDir, filename);
    const raw = await readFile(path, "utf-8");
    const json = JSON.parse(raw);

    const topics: ParsedTopic[] = (json.topics ?? []).map(
      (t: { topic: string; subtopics?: { name: string }[] }) => ({
        name: t.topic,
        subtopics: (t.subtopics ?? []).map((s) => ({ name: s.name })),
      })
    );

    result.push({ level: level as CEFRLevel, topics });
  }

  return result;
}
```

**Важливо:** `LEVEL_META` тут **немає** — він у `@lingua/shared` (задача 04).

### `scripts/lib/strapi-client.ts` — сигнатури

```ts
export async function strapiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T>;

export async function findOne<T>(
  collection: string,
  filters: Record<string, unknown>
): Promise<T | null>;

export async function create<T>(
  collection: string,
  data: Record<string, unknown>
): Promise<T>;
```

**Реалізація:**
- `strapiRequest` — додає `Authorization: Bearer ${STRAPI_API_TOKEN}`, `Content-Type: application/json`, кидає помилку з тілом при `!response.ok`.
- `findOne` — `GET /<collection>?filters=<JSON.stringify(filters)>`, повертає `data[0] ?? null`.
- `create` — `POST /<collection>` з тілом `{ data }`, повертає `result.data`.

### `scripts/seed.ts` — сигнатури

```ts
import { LEVEL_META } from "@lingua/shared";
import { parseAllTemplates } from "./lib/parse-templates.js";
import { create, findOne } from "./lib/strapi-client.js";

type Level = { id: number; code: string };
type Topic = { id: number; name: string };
type Subtopic = { id: number; name: string };

async function seedLevels(): Promise<Map<string, Level>>;
async function seedTopicsAndSubtopics(levels: Map<string, Level>): Promise<void>;
async function main(): Promise<void>;
```

---

## 🧠 Алгоритм (словами)

**`parseAllTemplates(dataDir = "data"):`**
1. Для кожного рівня з `LEVEL_FILES`:
   - Прочитати `<dataDir>/<filename>`.
   - `JSON.parse`.
   - Витягнути `{ level, topics: [{ name, subtopics: [{ name }] }] }`.
2. Повернути масив із 8 елементів.

**`seedLevels()`:**
1. Для кожного `(code, meta)` з `LEVEL_META` (імпорт з `@lingua/shared`):
   - `findOne("levels", { code: { $eq: code } })`.
   - Якщо є — log "exists", додати в Map.
   - Якщо немає — `create({ code, name: meta.name, description: meta.description, order: meta.order })`, log "created", додати в Map.
2. Повернути `Map<code, Level>`.

**`seedTopicsAndSubtopics(levels)`:**
1. `parseAllTemplates()`.
2. Для кожного файлу:
   - Знайти `level` у Map.
   - `topicOrder = 1`.
   - Для кожного topic:
     - `findOne("topics", { name, level: { id: level.id } })`.
     - Якщо немає — `create({ name, order: topicOrder, level: level.id })`.
     - `subtopicOrder = 1`.
     - Для кожного subtopic:
       - `findOne("subtopics", { name, topic: { id: topicId } })`.
       - Якщо немає — `create({ name, order: subtopicOrder, topic: topicId })`.
       - `subtopicOrder += 1`.
     - `topicOrder += 1`.

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

- **`STRAPI_API_TOKEN`** — створити в Admin (`http://localhost:1338/admin`): Settings → API Tokens → Full access. Записати в `.env`.
- **Формат запиту** — Strapi 5 очікує `{ data: {...} }` (не голий об'єкт).
- **Relation** — передається як `level: <id>` (число), не об'єкт.
- **Ідемпотентність** — обов'язкова. Завжди `findOne` перед `create`.
- **Порядок** — Levels спочатку (бо Topics залежать від них).
- **`order`** — інкремент у межах батька.
- **Порти:** Strapi — `localhost:1338` (хост) / `strapi:1337` (всередині Docker).

---

## 📝 README

Після завершення задачі — оновити `README.md`:
- [ ] Пункт «Seed data (8 Levels + Topics + Subtopics)» додати у «📊 Статус проєкту» → `[x]`

---

## 🧪 Як перевірити

```bash
# 1. Переконатись, що Strapi працює
docker compose ps      # strapi → healthy

# 2. Створити API Token в Admin (http://localhost:1338/admin)
#    Settings → API Tokens → Create → Full access
#    Скопіювати у .env як STRAPI_API_TOKEN

# 3. Встановити залежності
pnpm install

# 4. Запустити seed
pnpm seed

# 5. Перевірити через API (з токеном)
# Отримати токен:
TOKEN=$(grep STRAPI_API_TOKEN .env | cut -d= -f2)

curl -H "Authorization: Bearer $TOKEN" http://localhost:1338/api/levels
# → 8 записів

curl -H "Authorization: Bearer $TOKEN" http://localhost:1338/api/topics
# → 40+

curl -H "Authorization: Bearer $TOKEN" http://localhost:1338/api/subtopics
# → 100+

# 6. Перевірити ідемпотентність
pnpm seed
# → всі "already exists", дублів немає

# 7. Typecheck
pnpm typecheck
```

---

## 📎 Контекст

- `00_CONTEXT.md` → розділи 4, 9, 10
- `docs/tasks/03-strapi-content-types.md`
- `docs/tasks/04-shared-package.md`

---

## 💬 Commit message

```
feat(seed): populate Strapi with levels, topics, subtopics

- add scripts/seed.ts (idempotent)
- add scripts/lib/strapi-client.ts with findOne, create
- add scripts/lib/parse-templates.ts with LEVEL_FILES
- import LEVEL_META from @lingua/shared
- add pnpm seed script and tsx + dotenv dependencies
- add STRAPI_API_TOKEN to .env.example
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/05-seed-data
# ...
git add .
git commit -m "feat(seed): populate Strapi with levels, topics, subtopics"
git push origin feat/05-seed-data
```

---

## 📝 Нотатки

Заповнюється після завершення.

- Скільки всього Topics і Subtopics створилось? 8 Levels, 106 Topics, 178 Subtopics.
- Прибрала slug зі Strapi content-types: `slug` не потрібен у проєкті. Ніде не використовується (плани працюють з `topicName`, не slug). Він лише ускладнює seed і створює зайві колонки в БД.
- Чи знадобився `pnpm install` для `tsx`/`dotenv`? Створено: scripts/package.json бо скрипт лежить в корні та не має node_modules -> pnpm не строврює симлинк при pnpm install -> Node не знаходить пакети. В pnpm-workspace.yaml додано - "scripts"