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
> - Seed (задача 04)
> - Prisma (задача 06)
>
> **Тільки 4 content-types: Level, Topic, Subtopic, CuratedMaterial.**

---

## 🎯 Мета

Після завершення в Strapi Admin (`http://localhost:1337/admin`) є 4 content-types:
**Level** (без relations), **Topic** (→Level), **Subtopic** (→Topic), **CuratedMaterial** (→Subtopic).
Порожні, seed — задача 04.

---

## ✅ Acceptance Criteria

- [ ] У `apps/cms/src/api/` створені 4 content-types (по 4 файли на кожен)
- [ ] `Level` має поля: `code` (enum), `name`, `description`, `order`
- [ ] `Topic` має поля: `name`, `slug`, `description`, `order`, `level` (manyToOne)
- [ ] `Subtopic` має поля: `name`, `slug`, `description`, `order`, `topic` (manyToOne)
- [ ] `CuratedMaterial` має поля: `title`, `type`, `url`, `description`, `language`, `difficulty`, `subtopic` (manyToOne)
- [ ] Усі 4 типи видно в Strapi Admin після `docker compose restart strapi`
- [ ] `curl http://localhost:1337/api/levels` → `{ "data": [] }`
- [ ] `docker compose logs strapi --tail=50` без помилок

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Seed (задача 04)
- ❌ Права доступу Public role (окремо, якщо потрібно)
- ❌ Localization (пізніше)
- ❌ Медіа-поля, вебхуки, custom controllers

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
    "description": "CEFR levels: A1, A2, A2+, B1, B1+, B2, C1, C2"
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

### Controllers/Routes/Services (стандартні)

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

## 🧪 Як перевірити

```bash
docker compose restart strapi
docker compose logs -f strapi    # Ctrl+C коли "Welcome back"
# http://localhost:1337/admin → 4 нові типи в лівому меню

curl http://localhost:1337/api/levels
# → {"data":[],"meta":{...}}
```

---

## ⚠️ Нюанси

- **Порядок створення:** спочатку `level`, потім `topic`, потім `subtopic`, потім `curated-material`. Інакше relations не знайдуть target.
- **`enum` у Strapi** має точні значення (`"A2+"` — з плюсом). Це важливо для синхронізації з `@lingua/shared`.
- **`draftAndPublish: false`** для Level/Topic/Subtopic — вони не редагуються часто. Для CuratedMaterial — `true`, бо контент може додаватись.
- **Значення `enum`** мають **точно** збігатися з тими, що будуть у `@lingua/shared` (задача 05).
- **Права доступу** — за замовчуванням Public role не бачить нових типів. Для API це треба буде видати окремо (можна в задачі 04 або окремою).

---

## 📎 Контекст
- `00_CONTEXT.md` → розділи 4, 9, 10
- `docs/tasks/02-docker-compose.md`

---

## 💬 Commit message
```
feat(cms): add Level, Topic, Subtopic, CuratedMaterial content-types

- add Level schema with code, name, description, order
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