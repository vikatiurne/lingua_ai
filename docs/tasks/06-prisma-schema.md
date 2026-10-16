# 06 — Prisma Schema + Migrations

**Епік:** E2 — Data & Shared
**Розмір:** M (2–3 год)
**Залежності:** 02, 04
**Статус:** ✅ Done (з відхиленням — див. Нотатки)
**Гілка:** `feat/06-prisma-schema`

> ⚠️ **ЦЯ ЗАДАЧА СТВОРЮЄ PRISMA-СХЕМУ.**
> Postgres працює на порту **5433** (задача 02). Shared package з єнумами готовий (задача 04).
>
> ⚠️ **ВАЖЛИВО: Prisma і Strapi НЕ ДІЛЯТЬ ТАБЛИЦІ.**
> - Strapi володіє: `levels`, `topics`, `subtopics`, `curated_materials`, `up_users`, `strapi_*`.
> - Prisma володіє: `users`, `user_progress`, `plans`, `exercises`, `user_errors`, `calendar_events`.
>
> ⚠️ **Enum values у Prisma мають точно збігатися зі значеннями в `@lingua/shared`** (lowercase, snake_case).
> Це критично — інакше доведеться писати mapper'и.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - `apps/cms/**` (Strapi)
> - `apps/web/**` UI
> - AI-провайдери (задача 10)
> - Redis (задача 13)

---

## 🎯 Мета

Після завершення:
- `apps/web/prisma/schema.prisma` описує 6 моделей
- Міграція застосована до Postgres
- Prisma Client згенерований
- `pnpm --filter web db:studio` показує 6 таблиць

---

## 🔪 Вертикальний слайс

```
apps/web/
    ├─→ prisma/schema.prisma (6 моделей)
    ├─→ prisma/migrations/ (SQL)
    └─→ lib/db/client.ts (Prisma Client singleton)
         └─→ Postgres localhost:5433
              ├─→ strapi_* (власність Strapi)
              └─→ users, exercises, ... (власність Prisma)
```

**Перевірка:** `prisma migrate dev` проходить, `db:studio` показує таблиці.

---

## ✅ Acceptance Criteria

- [x] Є `apps/web/prisma/schema.prisma` з 6 моделями: User, UserProgress, Plan, Exercise, UserError, CalendarEvent
- [x] Є `apps/web/lib/db/client.ts` — Prisma Client singleton
- [x] `DATABASE_URL` у `.env` вказує на `postgres://lingua:lingua@localhost:5433/lingua_ai`
- [x] Міграція застосована (baseline-workflow, не migrate dev)
- [x] Є apps/web/prisma/migrations/**/migration.sql
- [x] pnpm --filter web prisma migrate status → up to date
- [x] `pnpm --filter web db:deploy` проходить
- [x] `pnpm --filter web db:generate` проходить
- [x] `pnpm --filter web db:studio` показує 6 таблиць Prisma + таблиці Strapi
- [x] Enum `CEFRLevel` має значення `A1`, `A2`, `A2_PLUS`, `B1`, `B1_PLUS`, `B2`, `C1`, `C2`
- [x] Enum `ErrorType` має значення `topic`, `general` (lowercase, як у shared)
- [x] Enum `ExerciseStatus` має значення `generated`, `in_progress`, `evaluated`, `reviewed`
- [x] Enum `ProgressStatus` має значення `not_started`, `in_progress`, `mastered`, `needs_review`
- [x] Enum `SentenceDirection` має значення `uk_en`, `en_uk`
- [x] Enum `ErrorRecyclingStatus` має значення `active`, `archived_success`, `archived_stuck`
- [x] `UserError` має поля `timesRecycled`, `successCount`, `failureCount`, `status`, `archivedAt`
- [x] Індекси на `(userId, status)` та `(userId, type)`
- [x] `pnpm typecheck` проходить
- [x] `apps/web/app/page.tsx` може імпортувати `import { prisma } from "@/lib/db/client"` без помилок

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Seed-скрипт для Prisma (задача 15+)
- ❌ API-роути (задача 19+)
- ❌ NextAuth-модели (Account, Session) — задача 15
- ❌ Міграція даних між рівнями (задача 44)
- ❌ Зміна схеми Strapi (задача 03)
- ❌ Тригери, вьюхи, raw SQL
- ❌ Mapper'и між Prisma і shared (не потрібні, бо значення однакові)

---

## 📁 Файли

### Створити в `apps/web/`
- `prisma/schema.prisma`
- `lib/db/client.ts`

### Створити (автоматично)
- `prisma/migrations/**`

### Змінити в `apps/web/`
- `package.json` — додати `prisma` (devDep) і `@prisma/client` (dep) + скрипти

### Змінити в корені
- `.env.example` — перевірити, що `DATABASE_URL` вказує на 5433

### Не чіпати
- `apps/cms/**`
- `packages/shared/**`
- `scripts/**`

---

## 🔧 Технічні деталі

### Встановлення

```bash
cd apps/web
pnpm add @prisma/client
pnpm add -D prisma
```

### `.env` (корінь)

```bash
DATABASE_URL=postgres://lingua:lingua@localhost:5433/lingua_ai
```

⚠️ Порт **5433** (Atlas займає 5432).

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
// Values MUST match @lingua/shared enums exactly (lowercase, snake_case).
// Only CEFRLevel keeps PascalCase because those are level names.

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
  not_started
  in_progress
  mastered
  needs_review
}

enum ExerciseStatus {
  generated
  in_progress
  evaluated
  reviewed
}

enum ErrorType {
  topic
  general
}

enum SentenceDirection {
  uk_en
  en_uk
}

enum ErrorRecyclingStatus {
  active
  archived_success
  archived_stuck
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

  status        ProgressStatus @default(not_started)
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

  status       ExerciseStatus @default(generated)
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

  // Error recycling tracking
  timesRecycled Int                   @default(0)
  successCount  Int                   @default(0)
  failureCount  Int                   @default(0)
  status        ErrorRecyclingStatus  @default(active)
  archivedAt    DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, type])
  @@index([userId, status])
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

## 📝 README

- [x] Пункт «Prisma schema + migrations» у «📊 Статус проєкту» → `[x]`

---

## 🧪 Як перевірити

```bash
# 1. Postgres працює на 5433
docker compose ps
# postgres → healthy, порт 0.0.0.0:5433->5432/tcp

# 2. DATABASE_URL
grep DATABASE_URL .env
# DATABASE_URL=postgres://lingua:lingua@localhost:5433/lingua_ai

# 3. Встановити
pnpm install

# 4. Generate client + застосувати міграцію (baseline workflow, не migrate dev)
pnpm --filter web db:generate
pnpm --filter web db:deploy
pnpm --filter web prisma migrate status    # up to date

# 5. Перевірити таблиці
docker compose exec postgres psql -U lingua -d lingua_ai -c "\dt"
# → users, user_progress, plans, exercises, user_errors, calendar_events
# + таблиці Strapi

# 6. Prisma Studio
pnpm --filter web db:studio
# http://localhost:5555

# 7. Typecheck
pnpm typecheck
```

---

## ⚠️ Що може піти не так

| Проблема | Рішення |
|---|---|
| `Can't reach database server at localhost:5433` | Перевірити `docker compose ps`, чи порт 5433 вільний |
| `Table "levels" already exists` | Нормально: `levels` належить Strapi. Prisma створює свої таблиці |
| TS помилки на `PrismaClient` | `pnpm --filter web db:generate` |
| `Cannot find module '@prisma/client'` | `pnpm install` |
| `Prisma enum values mismatch shared` | Переконатись, що enum values у `schema.prisma` — lowercase для ErrorType/ExerciseStatus/ProgressStatus |
| `prisma migrate reset` видаляє Strapi-таблиці | ⚠️ Обережно! Після reset — `pnpm seed` знову |
| `migrate dev` бачить Strapi-таблиці як drift | Використовуй baseline workflow + `db:deploy`, не `migrate dev` |
| Потрібна нова міграція | `prisma migrate diff` → `db execute` → `migrate resolve --applied` |

### ⚠️ Про `prisma migrate reset`

`prisma migrate reset` **видаляє всю БД**, включно з таблицями Strapi. Після нього:
1. `docker compose restart strapi`
2. `pnpm seed`
3. `pnpm --filter web db:migrate`

---

## 📎 Контекст

- `00_CONTEXT.md` → розділи 6, 8, 9
- `docs/tasks/02-docker-compose.md`
- `docs/tasks/04-shared-package.md`

---

## 💬 Commit message

```
feat(db): add prisma schema with 6 models and init migration

- add prisma/schema.prisma with User, UserProgress, Plan, Exercise, UserError, CalendarEvent
- add enums CEFRLevel, ProgressStatus, ExerciseStatus, ErrorType, SentenceDirection, ErrorRecyclingStatus
- align enum values with @lingua/shared (lowercase, snake_case)
- add recycling fields to UserError (timesRecycled, successCount, failureCount, status, archivedAt)
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

Заповнено після завершення.

- **Відступів від схеми немає.** Але Prisma зафіксовано на `6.19.3`: npm-тег `latest` = `8.0.0-rc.23` (RC), `@prisma/client@latest` = `7.x`. RC ламає формат зі задачі (`generator client-js` + `url = env(...)`), тому взято стабільну 6.x.
- **Enum values створені правильно** (перевірено `\dT+`): `CEFRLevel` — PascalCase (`A2_PLUS`, `B1_PLUS`), решта — lowercase/snake_case (`topic`, `generated`, `not_started`, `active`).
- **Strapi і Prisma співіснують у БД, але `prisma migrate dev` небезпечний.** Prisma вважає весь `public` своїм, бачить Strapi-таблиці як drift і пропонує `migrate reset` (знищить дані Strapi). Ініційну міграцію застосовано безпечно (baseline): `migrate diff` → `db execute` → `migrate resolve --applied`. Далі безпечні команди — `migrate status` / `migrate deploy`; `db:migrate` на спільній БД не запускати.
- **`PRISMA_DATABASE_URL` окремо не потрібен**, але Prisma CLI не читає кореневий `.env`. Створено `apps/web/.env` з `DATABASE_URL` (як `apps/cms/.env`); у git не потрапляє (`.env` у `.gitignore`). Рекомендовано згодом мати `apps/web/.env.example`.