# 02 — Docker Compose: Postgres + Redis + Strapi

**Епік:** E1 — Foundation
**Розмір:** M (2–3 год)
**Залежності:** 01
**Статус:** ⬜ Todo
**Гілка:** `feat/02-docker-compose`

> ⚠️ **ЦЯ ЗАДАЧА НАПОВНЮЄ `apps/cms/` РЕАЛЬНИМ STRAPI 5.**
> У задачі 01 там була тільки `package.json`-заглушка.
> Тепер додаються `Dockerfile`, `src/`, `config/`, `.env` для Strapi.
>
> ⚠️ **ЦЯ ЗАДАЧА НЕ ТОРКАЄТЬСЯ:**
> - `apps/web/**` (Next.js працює локально через `pnpm dev:web`)
> - `packages/shared/**`
> - Prisma-схема (задача 06)
> - Redis-клієнт у Next.js (задача 13)

---

## 🎯 Мета

Після завершення задачі команда `docker compose up -d` піднімає Postgres, Redis і Strapi.
Strapi Admin доступний на `http://localhost:1337/admin`.
Дані зберігаються у Docker volumes між перезапусками.
Next.js продовжує запускатись локально через `pnpm dev:web`.

---

## 🔪 Вертикальний слайс

```
docker compose up -d
    ├─→ postgres:16 (volume: postgres_data)
    ├─→ redis:7     (volume: redis_data)
    └─→ strapi:5    (depends_on postgres, redis)
         └─→ http://localhost:1337/admin
```

**Перевірка:** `docker compose ps` показує 3 healthy контейнери.

---

## ✅ Acceptance Criteria

- [ ] У корені є `docker-compose.yml`
- [ ] Є `docker/redis/redis.conf`
- [ ] Є `apps/cms/Dockerfile` (multistage, dev)
- [ ] Є `.env.example` з усіма змінними
- [ ] `apps/cms/` містить реальний Strapi 5 (`src/`, `config/`)
- [ ] `docker compose up -d` піднімає 3 контейнери без помилок
- [ ] `docker compose ps` показує `postgres` і `redis` у стані `healthy`
- [ ] `http://localhost:1337/admin` відкривається — можна створити першого адміна
- [ ] `redis-cli -h localhost ping` повертає `PONG`
- [ ] `psql` до Postgres працює з хост-машини
- [ ] Після `docker compose down` і `up -d` дані зберігаються
- [ ] `docker compose logs -f strapi` не показує помилок підключення до БД

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Next.js у Docker (локально через `pnpm dev:web`)
- ❌ Content-types у Strapi (Topic, Subtopic, Template) — задача 03
- ❌ Seed 24 JSON files — задача 04
- ❌ Redis-клієнт у Next.js — задача 13
- ❌ Production-ready образи — задача 47
- ❌ CI/CD з Docker — задача 48
- ❌ Nginx / reverse proxy
- ❌ SSL / HTTPS локально

---

## 📁 Файли, які треба створити/змінити

### Створити в корені

- `docker-compose.yml`
- `.env.example`
- `.env` (локально, у `.gitignore`)

### Створити в `docker/redis/`

- `redis.conf`

### Створити/оновити в `apps/cms/`

- `Dockerfile` — **NEW**
- `.env` — **NEW** (локально, у `.gitignore`)
- `src/` — **NEW** (Strapi 5 генерує сам)
- `config/` — **NEW** (Strapi 5 генерує сам)
- `package.json` — **ОНОВИТИ** (замінити заглушку з задачі 01 на реальний Strapi)
- `tsconfig.json` — **NEW** (Strapi)
- `favicon.png`, `public/` — генерується Strapi

### Не чіпати

- `apps/web/**`
- `packages/shared/**`
- `package.json` (корінь)
- `pnpm-workspace.yaml`
- `turbo.json`

---

## 🔧 Технічні деталі

### Як створити Strapi 5 в `apps/cms/`

**Спосіб 1 (рекомендований):**

```bash
cd apps/cms
# Видалити заглушку package.json з задачі 01
rm package.json

# Створити Strapi на місці
pnpm dlx create-strapi-app@latest . --quickstart --no-run

# Або інтерактивно:
pnpm dlx create-strapi-app@latest .
# Обрати: JavaScript or TypeScript → TypeScript
# Database: PostgreSQL
# Інші параметри — за замовчуванням
```

**Спосіб 2 (вручну):**
Створити всі файли Strapi 5 вручну (`package.json`, `config/`, `src/`, `tsconfig.json`).

**У будь-якому разі:** після створення `apps/cms/package.json` має містити залежності Strapi:
- `@strapi/strapi`
- `@strapi/plugin-users-permissions`
- `@strapi/plugin-cloud` (опціонально)
- `pg` (для PostgreSQL)
- `react`, `react-dom`, `styled-components` (для Admin UI)

### `.env.example` (корінь)

```bash
# Postgres
POSTGRES_USER=lingua
POSTGRES_PASSWORD=lingua
POSTGRES_DB=lingua_ai
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Strapi
STRAPI_PORT=1337
STRAPI_APP_KEYS=toBeModified1,toBeModified2
STRAPI_API_TOKEN_SALT=toBeModified
STRAPI_ADMIN_JWT_SECRET=toBeModified
STRAPI_TRANSFER_TOKEN_SALT=toBeModified
STRAPI_JWT_SECRET=toBeModified

# URLs
DATABASE_URL=postgres://lingua:lingua@localhost:5432/lingua_ai
REDIS_URL=redis://localhost:6379
STRAPI_URL=http://localhost:1337
```

### `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "${POSTGRES_PORT}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server /usr/local/etc/redis/redis.conf
    ports:
      - "${REDIS_PORT}:6379"
    volumes:
      - redis_data:/data
      - ./docker/redis/redis.conf:/usr/local/etc/redis/redis.conf:ro
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  strapi:
    build:
      context: ./apps/cms
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: development
      DATABASE_CLIENT: postgres
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: ${POSTGRES_DB}
      DATABASE_USERNAME: ${POSTGRES_USER}
      DATABASE_PASSWORD: ${POSTGRES_PASSWORD}
      APP_KEYS: ${STRAPI_APP_KEYS}
      API_TOKEN_SALT: ${STRAPI_API_TOKEN_SALT}
      ADMIN_JWT_SECRET: ${STRAPI_ADMIN_JWT_SECRET}
      TRANSFER_TOKEN_SALT: ${STRAPI_TRANSFER_TOKEN_SALT}
      JWT_SECRET: ${STRAPI_JWT_SECRET}
    ports:
      - "${STRAPI_PORT}:1337"
    volumes:
      - ./apps/cms:/app
      - /app/node_modules
      - strapi_uploads:/app/public/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:
  redis_data:
  strapi_uploads:
```

**Нотатки:**
- Без `version:` — застаріле поле у Compose v2.
- `strapi_uploads` — щоб завантажені зображення не зникали при пересборці.
- `- /app/node_modules` — щоб не перезаписувати контейнерні node_modules хостовими.

### `docker/redis/redis.conf`

```
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
appendfsync everysec
save 900 1
save 300 10
```

### `apps/cms/Dockerfile`

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 1337
CMD ["pnpm", "develop"]
```

---

## 🧪 Як перевірити

```bash
# 1. Створити Strapi в apps/cms (див. вище)
cd apps/cms
pnpm dlx create-strapi-app@latest . --quickstart --no-run
cd ../..

# 2. Скопіювати env
cp .env.example .env
# Заповнити STRAPI_* змінні (можна випадковими)

# 3. Підняти
docker compose up -d

# 4. Дочекатись healthy
docker compose ps

# 5. Перевірити логи Strapi
docker compose logs -f strapi
# Ctrl+C коли побачиш "Welcome back"

# 6. Відкрити http://localhost:1337/admin
# Створити першого адміна

# 7. Перевірити Redis
redis-cli -h localhost ping
# → PONG

# 8. Перевірити Postgres
psql postgres://lingua:lingua@localhost:5432/lingua_ai -c "\dt"
# → список таблиць Strapi

# 9. Перезапустити
docker compose down
docker compose up -d
# Дані мають залишитись
```

---

## ⚠️ Що може піти не так

| Проблема | Рішення |
|---|---|
| Порт 5432/6379/1337 зайнятий | Змінити в `.env` |
| Strapi не стартує — `APP_KEYS` | Перевірити, що всі `STRAPI_*` заповнені |
| `pnpm-lock.yaml` не знайдено | `cd apps/cms && pnpm install --lockfile-only` |
| `permission denied` на `redis.conf` | `chmod 644 docker/redis/redis.conf` |
| Postgres volume займає місце | `docker compose down -v` (видалить дані!) |
| `Cannot find module 'pg'` у Strapi | Додати `pg` у залежності `apps/cms/package.json` |
| Strapi не бачить `.env` | Перевірити `apps/cms/.env` або env у `docker-compose.yml` |

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 6 (Технічний стек)
- `00_CONTEXT.md` → розділ 7 (Архітектура)
- `00_CONTEXT.md` → розділ 11 (Redis — ключі)
- `docs/tasks/01-monorepo-setup.md`

---

## 💬 Commit message

```
build(docker): add compose with postgres, redis, strapi

- add docker-compose.yml with healthchecks and named volumes
- add docker/redis/redis.conf with LRU policy and AOF
- add apps/cms with Strapi 5 (replaces placeholder)
- add apps/cms/Dockerfile for dev hot-reload
- add .env.example with all required env vars
- add .env to .gitignore
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/02-docker-compose

# ... робота ...

git add .
git commit -m "build(docker): add compose with postgres, redis, strapi"
git push origin feat/02-docker-compose
```

---

## 📝 Нотатки

Заповнюється після завершення.

- Чи довелось змінювати `config/database.ts` у Strapi?
- Скільки часу займає перший білд `apps/cms/Dockerfile`?
- Чи є проблеми з правами на `public/uploads`?
- Що винести в окрему задачу (наприклад, production Dockerfile)?