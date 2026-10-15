# 06 — Prisma Schema + Migrations

**Епік:** E2 — Data & Shared
**Розмір:** M (2–3 год)
**Залежності:** 02, 04
**Статус:** ⬜ Todo
**Гілка:** `feat/06-prisma-schema`

> ⚠️ **ЦЯ ЗАДАЧА СТВОРЮЄ PRISMA-СХЕМУ.**
> Postgres уже працює в Docker (задача 02). Shared package з єнумами готовий (задача 04).
>
> ⚠️ **ВАЖЛИВО: Prisma і Strapi НЕ ДІЛЯТЬ ТАБЛИЦІ.**
> - Strapi володіє: `levels`, `topics`, `subtopics`, `curated_materials`, `up_users` (адмін), `strapi_*` (службові).
> - Prisma володіє: `users`, `user_progress`, `plans`, `exercises`, `user_errors`, `calendar_events`.
> - Вони в одній БД, але з різними іменами таблиць.
>
> ⚠️ **ЦЯ ЗАДАЧА НЕ ТОРКАЄТЬСЯ:**
> - `apps/cms/**` (Strapi)
> - `apps/web/**` UI (Next.js UI)
> - AI-провайдери (задача 10)
> - Redis (задача 13)

---

## 🎯 Мета

Після завершення задачі:
- `apps/web/prisma/schema.prisma` описує 6 моделей
- Міграція застосована до Postgres
- Prisma Client згенерований
- `pnpm prisma studio` показує всі таблиці

Таблиці Strapi та Prisma співіснують у БД `lingua_ai`.

---

## 🔪 Вертикальний слайс

```
apps/web/
    ├─→ prisma/schema.prisma (6 моделей)
    ├─→ prisma/migrations/ (SQL)
    └─→ lib/db/client.ts (Prisma Client singleton)
         └─→ Postgres (Docker)
              ├─→ strapi_* (власність Strapi)
              └─→ users, exercises, ... (власність Prisma)
```

**Перевірка:** `prisma migrate dev` проходить, `prisma studio` показує таблиці.

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/prisma/schema.prisma` з 6 моделями: User, UserProgress, Plan, Exercise, UserError, CalendarEvent
- [ ] Є `apps/web/lib/db/client.ts` — Prisma Client singleton
- [ ] `DATABASE_URL` у `.env` вказує на `postgres://lingua:lingua@localhost:5432/lingua_ai`
- [ ] `pnpm --filter web prisma migrate dev --name init` проходить без помилок
- [ ] `pnpm --filter web prisma generate` проходить
- [ ] `pnpm --filter web prisma studio` показує 6 таблиць Prisma + таблиці Strapi
- [ ] Enum `CEFRLevel` у Prisma використовує `A2_PLUS`, `B1_PLUS` (без `+`)
- [ ] `pnpm typecheck` проходить
- [ ] `apps/web/app/page.tsx` може імпортувати `import { prisma } from "@/lib/db/client"` без помилок

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Seed-скрипт для Prisma (задача 15+)
- ❌ API-роути (задача 19+)
- ❌ NextAuth-модели (Account, Session) — задача 15
- ❌ Міграція даних між рівнями (задача 44)
- ❌ Зміна схеми Strapi (задача 03)
- ❌ Тригери, вьюхи, raw SQL

---

## 📁 Файли, які треба створити/змінити

### Створити в `apps/web/`

- `prisma/schema.prisma`
- `lib/db/client.ts`

### Створити (автоматично)

- `prisma/migrations/**` (генерується Prisma)

### Змінити в `apps/web/`

- `package.json` — додати `prisma` та `@prisma/client`
- `.env` (локально) — додати `DATABASE_URL`

### Змінити в корені

- `.env.example` — перевірити, що `DATABASE_URL` є
- `.gitignore` — **НЕ** додавати `apps/web/prisma/migrations/**` — міграції треба комітити

### Не чіпати

- `apps/cms/**`
- `packages/shared/**`

---

## 🔧 Технічні деталі

### Встановлення Prisma

```bash
cd apps/web
pnpm add @prisma/client
pnpm add -D prisma
```

### `.env` (корінь)

```bash
DATABASE_URL=postgres://lingua:lingua@localhost:5432/lingua_ai
```

### `apps/web/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================
// Enums
// ==================

enum CEFRLevel {
  A1
  A2
  A2_PLUS
  B1
  B1_PLUS
  B2
  C1
  C2
}

enum ProgressStatus {
  NOT_STARTED
  IN_PROGRESS
  MASTERED
  NEEDS_REVIEW
}

enum ExerciseStatus {
  GENERATED
  IN_PROGRESS
  EVALUATED
  REVIEWED
}

enum ErrorType {
  TOPIC
  GENERAL
}

enum SentenceDirection {
  UK_EN
  EN_UK
}

// ==================
// Models
// ==================

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  passwordHash  String?
  image         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  level         CEFRLevel?
  targetLevel   CEFRLevel?
  dailyMinutes  Int      @default(30)

  progress       UserProgress[]
  plans          Plan[]
  exercises      Exercise[]
  errors         UserError[]
  calendarEvents CalendarEvent[]

  @@map("users")
}

model UserProgress {
  id            String         @id @default(cuid())
  userId        String
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  level         CEFRLevel
  topicName     String
  subtopicName  String?
  templateId    String?

  status        ProgressStatus @default(NOT_STARTED)
  score         Float?
  attempts      Int            @default(0)
  lastPracticed DateTime?

  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@unique([userId, level, topicName, subtopicName, templateId])
  @@index([userId, level])
  @@map("user_progress")
}

model Plan {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  level     CEFRLevel
  content   Json
  isActive  Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, isActive])
  @@map("plans")
}

model Exercise {
  id           String         @id @default(cuid())
  userId       String
  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  planId       String?

  level        CEFRLevel
  topicName    String
  subtopicName String?
  templateIds  String[]

  sentences    Json

  topicScore   Float?
  grammarScore Float?

  status       ExerciseStatus @default(GENERATED)
  createdAt    DateTime       @default(now())
  completedAt  DateTime?

  errors       UserError[]

  @@index([userId, status])
  @@index([userId, level])
  @@map("exercises")
}

model UserError {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  exerciseId  String
  exercise    Exercise @relation(fields: [exerciseId], references: [id], onDelete: Cascade)

  type        ErrorType
  sentence    String
  userAnswer  String
  reference   String
  explanation String   @db.Text
  category    String?
  word        String?
  translation String?

  createdAt   DateTime @default(now())

  @@index([userId, type])
  @@index([exerciseId])
  @@map("user_errors")
}

model CalendarEvent {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  title        String
  description  String?
  scheduledAt  DateTime
  durationMin  Int      @default(30)
  reminderSent Boolean  @default(false)
  icsToken     String?  @unique

  createdAt    DateTime @default(now())

  @@index([userId, scheduledAt])
  @@map("calendar_events")
}
```

### `apps/web/lib/db/client.ts`

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### `apps/web/package.json` — додати скрипти

```json
{
  "scripts": {
    "prisma": "prisma",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset"
  }
}
```

---

## 🧪 Як перевірити

```bash
# 1. Переконатись, що Postgres працює
docker compose ps
# postgres → healthy

# 2. Перевірити DATABASE_URL
cat .env | grep DATABASE_URL
# DATABASE_URL=postgres://lingua:lingua@localhost:5432/lingua_ai

# 3. Встановити залежності
pnpm install

# 4. Згенерувати Prisma Client
pnpm --filter web db:generate

# 5. Застосувати міграцію
pnpm --filter web db:migrate --name init
# Очікується: створені 6 таблиць + enum-типи

# 6. Перевірити через psql
psql postgres://lingua:lingua@localhost:5432/lingua_ai -c "\dt"
# → users, user_progress, plans, exercises, user_errors, calendar_events
# + таблиці Strapi

# 7. Відкрити Prisma Studio
pnpm --filter web db:studio
# http://localhost:5555 → 6 моделей

# 8. Typecheck
pnpm typecheck
# Без помилок
```

---

## ⚠️ Що може піти не так

| Проблема | Рішення |
|---|---|
| `Can't reach database server` | Перевірити `docker compose ps` і `DATABASE_URL` |
| `Table "levels" already exists` | Нормально: `levels` належить Strapi. Prisma створює свої таблиці |
| `duplicate key on _prisma_migrations` | Strapi не чіпає цю таблицю. Перевірити, що міграція одна |
| `relation "users" does not exist` у Strapi | Нормально: Strapi використовує `up_users` |
| TS помилки на `PrismaClient` | `pnpm --filter web db:generate` |
| `Cannot find module '@prisma/client'` | `pnpm --filter web install` |

### ⚠️ Про `prisma migrate reset`

`prisma migrate reset` **видаляє всю БД**, включно з таблицями Strapi. Після нього треба:
1. `docker compose restart strapi`
2. `pnpm seed` (задача 05 — знову наповнити Strapi)

Або налаштувати Prisma так, щоб вона не чіпала Strapi-таблиці (за замовчуванням так і є).

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 6 (Технічний стек)
- `00_CONTEXT.md` → розділ 8 (Структура репозиторію)
- `00_CONTEXT.md` → розділ 9 (Рівні CEFR)
- `docs/tasks/02-docker-compose.md`
- `docs/tasks/04-shared-package.md`

---

## 💬 Commit message

```
feat(db): add prisma schema with 6 models and init migration

- add prisma/schema.prisma with User, UserProgress, Plan, Exercise, UserError, CalendarEvent
- add enums CEFRLevel, ProgressStatus, ExerciseStatus, ErrorType, SentenceDirection
- add lib/db/client.ts prisma singleton
- add db:* npm scripts
- init migration
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/06-prisma-schema

# ... робота ...

git add .
git commit -m "feat(db): add prisma schema with 6 models and init migration"
git push origin feat/06-prisma-schema
```

---

## 📝 Нотатки

Заповнюється після завершення.

- Чи довелось відступати від схеми в `DATA_MODEL.md`?
- Чи потрібен `prisma migrate reset` у dev-скриптах?
- Чи співіснують Strapi і Prisma в одній БД без конфліктів?
- Чи варто перенести `DATABASE_URL` для Prisma в окрему змінну (`PRISMA_DATABASE_URL`)?