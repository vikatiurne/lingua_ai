# 03 — Strapi Content-Types

**Епік:** E1 — Foundation
**Розмір:** M (2–3 год)
**Залежності:** 02
**Статус:** ⬜ Todo
**Гілка:** `feat/03-strapi-content-types`

> ⚠️ **ЦЯ ЗАДАЧА СТВОРЮЄ CONTENT-TYPES У STRAPI.**
> Strapi вже працює (задача 02). Наповнюємо його схемою.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - `apps/web/**`, `packages/shared/**`
> - JSON-файли `data/**` (вони — джерело істини)
> - Seed (задача 05)
> - Prisma (задача 06)
>
> **Тільки 4 content-types: Level, Topic, Subtopic, CuratedMaterial.**

---

## 🎯 Мета

Після завершення в Strapi Admin (`http://localhost:1338/admin`) є 4 content-types:
**Level** (без relations), **Topic** (→Level), **Subtopic** (→Topic), **CuratedMaterial** (→Subtopic).
Порожні, seed — задача 05.

---

## ✅ Acceptance Criteria

- [ ] У `apps/cms/src/api/` створені 4 content-types (по 4 файли на кожен)
- [ ] `Level` має поля: `code` (enum), `name`, `description`, `order`
- [ ] `Topic` має поля: `name`, `slug`, `description`, `order`, `level` (manyToOne)
- [ ] `Subtopic` має поля: `name`, `slug`, `description`, `order`, `topic` (manyToOne)
- [ ] `CuratedMaterial` має поля: `title`, `type`, `url`, `description`, `language`, `difficulty`, `subtopic` (manyToOne)
- [ ] `Level.code` enum має значення: `["A1", "A2", "A2_PLUS", "B1", "B1_PLUS", "B2", "C1", "C2"]`
- [ ] Усі 4 типи видно в Strapi Admin (`http://localhost:1338/admin`) після `docker compose restart strapi`
- [ ] `docker compose logs strapi --tail=50` без помилок
- [ ] У Strapi Admin → Content Manager → Level → Create new entry форма відкривається, enum `code` показує 8 значень

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Seed (задача 05)
- ❌ Права доступу Public role (окремо, якщо потрібно)
- ❌ Localization (пізніше)
- ❌ Медіа-поля, вебхуки, custom controllers
- ❌ Перевірка через публічний API (без прав Public role поверне 403)

---

## 📁 Файли

Для кожного типу — 4 файли (16 всього):

```
apps/cms/src/api/level/
├── content-types/level/schema.json
├── controllers/level.ts
├── routes/level.ts
└── services/level.ts
```

Аналогічно для `topic`, `subtopic`, `curated-material`.

---

## 🔧 Хрупкі схеми (обов'язково)

### `level/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "levels",
  "info": {
    "singularName": "level",
    "pluralName": "levels",
    "displayName": "Level",
    "description": "CEFR levels: A1, A2, A2_PLUS, B1, B1_PLUS, B2, C1, C2"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {},
  "attributes": {
    "code": {
      "type": "enumeration",
      "enum": ["A1", "A2", "A2_PLUS", "B1", "B1_PLUS", "B2", "C1", "C2"],
      "required": true,
      "unique": true
    },
    "name": { "type": "string", "required": true },
    "description": { "type": "text" },
    "order": { "type": "integer", "required": true, "default": 0 },
    "topics": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::topic.topic",
      "mappedBy": "level"
    }
  }
}
```

**Важливо:** `enum` значення — **точно** `A2_PLUS`, `B1_PLUS` (з підкресленням). Не `A2+`. Це критично для синхронізації з `@lingua/shared` (задача 04) і Prisma (задача 06).

### `topic/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "topics",
  "info": {
    "singularName": "topic",
    "pluralName": "topics",
    "displayName": "Topic",
    "description": "Grammar or lexical topics within a level"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {},
  "attributes": {
    "name": { "type": "string", "required": true },
    "slug": { "type": "uid", "targetField": "name", "required": true },
    "description": { "type": "text" },
    "order": { "type": "integer", "required": true, "default": 0 },
    "level": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::level.level",
      "inversedBy": "topics",
      "required": true
    },
    "subtopics": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::subtopic.subtopic",
      "mappedBy": "topic"
    }
  }
}
```

### `subtopic/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "subtopics",
  "info": {
    "singularName": "subtopic",
    "pluralName": "subtopics",
    "displayName": "Subtopic",
    "description": "Subtopics within a topic"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {},
  "attributes": {
    "name": { "type": "string", "required": true },
    "slug": { "type": "uid", "targetField": "name", "required": true },
    "description": { "type": "text" },
    "order": { "type": "integer", "required": true, "default": 0 },
    "topic": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::topic.topic",
      "inversedBy": "subtopics",
      "required": true
    },
    "curatedMaterials": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::curated-material.curated-material",
      "mappedBy": "subtopic"
    }
  }
}
```

### `curated-material/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "curated_materials",
  "info": {
    "singularName": "curated-material",
    "pluralName": "curated-materials",
    "displayName": "Curated Material",
    "description": "Podcasts, films, articles recommended for a subtopic"
  },
  "options": { "draftAndPublish": true },
  "pluginOptions": {},
  "attributes": {
    "title": { "type": "string", "required": true },
    "type": {
      "type": "enumeration",
      "enum": ["podcast", "film", "article", "series", "book", "video"],
      "required": true
    },
    "url": { "type": "string", "required": true },
    "description": { "type": "text" },
    "language": {
      "type": "enumeration",
      "enum": ["en", "uk", "other"],
      "default": "en"
    },
    "difficulty": {
      "type": "enumeration",
      "enum": ["easy", "medium", "hard"],
      "default": "medium"
    },
    "subtopic": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::subtopic.subtopic",
      "inversedBy": "curatedMaterials",
      "required": true
    }
  }
}
```

### Controllers / Routes / Services (стандартні)

Для кожного типу `X` — три файли зі стандартним фабричним кодом Strapi 5:

**`controllers/X.ts`:**
```ts
import { factories } from "@strapi/strapi";
export default factories.createCoreController("api::X.X");
```

**`routes/X.ts`:**
```ts
import { factories } from "@strapi/strapi";
export default factories.createCoreRouter("api::X.X");
```

**`services/X.ts`:**
```ts
import { factories } from "@strapi/strapi";
export default factories.createCoreService("api::X.X");
```

Де `X` — `level`, `topic`, `subtopic`, `curated-material`.

---

## 📝 README

Після завершення задачі — **README не змінюється**.
(Strapi content-types не відображаються в README — вони внутрішні.)

---

## 🧪 Як перевірити

```bash
# 1. Перезапустити Strapi
docker compose restart strapi

# 2. Подивитись логи — має бути "Welcome back" без помилок
docker compose logs -f strapi
# Ctrl+C

# 3. Відкрити Strapi Admin
# http://localhost:1338/admin
# → У лівому меню: Level, Topic, Subtopic, Curated Material

# 4. Перевірити поля Level
# Content Manager → Level → Create new entry
# code (dropdown, 8 значень), name, description, order → зберегти
# Save → Publish

# 5. Перевірити через admin token (опційно)
# Створити API token: Settings → API Tokens → Full access
curl -H "Authorization: Bearer <TOKEN>" http://localhost:1338/api/levels
# → {"data":[],"meta":{...}}
```

---

## ⚠️ Нюанси

- **Порти змінені:** Lingua використовує `5433`/`6380`/`1338`. Atlas — `5432`/`6379`/`1337`. Не плутати.
- **Порядок створення:** спочатку `level`, потім `topic`, потім `subtopic`, потім `curated-material`. Інакше relations не знайдуть target.
- **Значення enum:** **точно** `A2_PLUS`, `B1_PLUS` — з підкресленням. Не `A2+`. Це критично.
- **`draftAndPublish: false`** для Level/Topic/Subtopic — вони не редагуються часто. Для CuratedMaterial — `true`.
- **Значення enum** мають **точно** збігатися з тими, що будуть у `@lingua/shared` (задача 04).
- **Права доступу** — за замовчуванням Public role не бачить нових типів. Для API це треба буде видати окремо (у задачі 05 або окремою).
- **Після `docker compose restart strapi`** — Strapi автоматично створює таблиці в Postgres. Перший restart може зайняти 30–60 секунд.

---

## 📎 Контекст

- `00_CONTEXT.md` → розділи 4, 9, 10
- `docs/tasks/02-docker-compose.md`

---

## 💬 Commit message

```
feat(cms): add Level, Topic, Subtopic, CuratedMaterial content-types

- add Level schema with code enum (A1..C2), name, description, order
- add Topic with relation to Level
- add Subtopic with relation to Topic
- add CuratedMaterial with relation to Subtopic
- add standard factories controllers, routes, services
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/03-strapi-content-types
# ...
git add .
git commit -m "feat(cms): add Level, Topic, Subtopic, CuratedMaterial content-types"
git push origin feat/03-strapi-content-types
```