# 13 — Redis Cache Layer

**Епік:** E3 — AI & Cache
**Розмір:** S (1–2 год)
**Залежності:** 02, 10
**Статус:** ⬜ Todo
**Гілка:** `feat/13-redis-cache`

> ⚠️ **ЦЯ ЗАДАЧА — ШАР КЕШУ ДЛЯ AI.**
> Redis працює на порту **6380** (задача 02). AI-провайдери готові (задачі 10–12).
> Тепер обгортаємо виклики AI у кеш.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Rate limiting (задача 14)
> - Конкретні промпти (задачі 26+)
> - Логування у БД (задача 35)
> - UI

---

## 🎯 Мета

Після завершення задачі:
- Є Redis-клієнт (`lib/redis/client.ts`)
- Є функції `cacheGet`, `cacheSet`, `withCache`
- Є функція `hashPrompt` для ключів
- Є обгортка `completeCached(messages, options)` — як `completeWithFallback`, але з кешем
- Якщо Redis недоступний — fallback без кеша (graceful degradation)
- Є змінна `REDIS_URL` у `.env` (порт **6380**)

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/lib/redis/client.ts` — singleton ioredis
- [ ] Є `apps/web/lib/redis/cache.ts` — `cacheGet`, `cacheSet`, `withCache`, `hashPrompt`
- [ ] Є `apps/web/lib/ai/cached.ts` — `completeCached`
- [ ] Є тести для cache (6+) і для cached (4+)
- [ ] Redis singleton не створює кілька з'єднань
- [ ] Якщо `REDIS_URL` не вказано або Redis недоступний — `completeCached` працює без кеша
- [ ] TTL за замовчуванням: 24 години (86400 секунд)
- [ ] Ключ має формат `ai:<sha256(prompt)>`
- [ ] `.env.example` містить `REDIS_URL=redis://localhost:6380`
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Rate limiting (задача 14)
- ❌ BullMQ (задача 42)
- ❌ Кеш слотів/шаблонів (вони й так у пам'яті, задача 07)
- ❌ Сесії NextAuth у Redis (не потрібно)
- ❌ Pub/Sub
- ❌ Кеш з тегами (invalidation)

---

## 📁 Файли

### Створити

- `apps/web/lib/redis/client.ts`
- `apps/web/lib/redis/cache.ts`
- `apps/web/lib/redis/cache.test.ts`
- `apps/web/lib/ai/cached.ts`
- `apps/web/lib/ai/cached.test.ts`

### Змінити

- `.env.example` (корінь) — додати `REDIS_URL=redis://localhost:6380`
- `apps/web/package.json` — додати `ioredis`

### Не чіпати

- `apps/web/lib/ai/providers/**`
- `apps/web/lib/ai/fallback.ts`, `provider.ts`, `types.ts`, `errors.ts`, `logger.ts`, `cross-check.ts`
- `packages/shared/**`
- Prisma

---

## 🔧 Інтерфейси (обов'язково)

### `lib/redis/client.ts`

```ts
import type { Redis } from "ioredis";

export const redis: Redis;
export function isRedisAvailable(): boolean;
```

### `lib/redis/cache.ts`

```ts
export function hashPrompt(prompt: string): string;

export function cacheGet<T>(key: string): Promise<T | null>;
export function cacheSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
export function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T>;
```

### `lib/ai/cached.ts`

```ts
import type { AIMessage, AICompletionOptions, AICompletionResult } from "./types";

export type CachedCompletionResult = AICompletionResult & {
  cached: boolean;
};

export function completeCached(
  messages: AIMessage[],
  options?: AICompletionOptions & { cacheTtlSeconds?: number }
): Promise<CachedCompletionResult>;
```

**Різниця від `completeWithFallback`:** повертає `cached: boolean`, щоб знати, чи відповідь із кеша.

---

## 🧠 Алгоритм (словами)

### `client.ts` — singleton

1. Створити `new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 3 })`.
2. Якщо `REDIS_URL` не вказано → створити «фейковий» клієнт, який завжди кидає помилку (щоб `isRedisAvailable()` повертав `false`).
3. Обробити події:
   - `connect` → log info.
   - `error` → log warn (не кидати).
4. `isRedisAvailable()` — повертає `redis.status === "ready"`.

**Singleton через `globalThis`** (як Prisma-клієнт), щоб у dev-режимі з hot-reload не було 100 з'єднань.

### `cache.ts`

**`hashPrompt(prompt)`:**
- `crypto.createHash("sha256").update(prompt).digest("hex")`.
- Повертає 64-символьний hex.

**`cacheGet<T>(key)`:**
1. Якщо Redis недоступний → `null`.
2. `redis.get(key)`.
3. Якщо `null` → `null`.
4. `JSON.parse` у `try/catch`.
5. При помилці парсингу → `null` + log warn.

**`cacheSet<T>(key, value, ttl)`:**
1. Якщо Redis недоступний → нічого.
2. `redis.set(key, JSON.stringify(value), "EX", ttl)`.
3. При помилці — log warn, не кидати.

**`withCache<T>(key, ttl, fn)`:**
1. `cached = await cacheGet<T>(key)`.
2. Якщо `cached !== null` → повернути `cached`.
3. `result = await fn()`.
4. `await cacheSet(key, result, ttl)`.
5. Повернути `result`.

**Ключове:** `withCache` ніколи не кидає помилки через Redis. Якщо Redis впав — просто викликає `fn()`.

### `cached.ts`

**`completeCached(messages, options)`:**
1. `promptKey = hashPrompt(JSON.stringify({ messages, options: pick(options, ["model", "temperature", "responseFormat"]) }))`.
2. `key = \`ai:${promptKey}\``.
3. `ttl = options?.cacheTtlSeconds ?? 86400`.
4. `cached = await cacheGet<AICompletionResult>(key)`.
5. Якщо є → повернути `{ ...cached, cached: true }`.
6. Викликати `completeWithFallback(messages, options)`.
7. `await cacheSet(key, result, ttl)`.
8. Повернути `{ ...result, cached: false }`.

**Що входить у ключ:**
- `messages` (весь масив).
- `model`, `temperature`, `responseFormat` — впливають на відповідь.
- **НЕ входить:** `timeoutMs`, `signal`, `cacheTtlSeconds`.

**Що НЕ кешуємо:**
- Якщо `options.cacheTtlSeconds === 0` → пропустити кеш.

---

## 🔬 Приклади входу/виходу

```ts
// Перший виклик — cache miss
await completeCached([{ role: "user", content: "Hello" }])
// → { text: "...", provider: "openrouter", cached: false, ... }

// Другий виклик — cache hit
await completeCached([{ role: "user", content: "Hello" }])
// → { text: "...", provider: "openrouter", cached: true, ... }
// HTTP-запиту НЕ було

// Redis недоступний
await completeCached([{ role: "user", content: "Hello" }])
// → { text: "...", cached: false, ... }
// Працює, просто без кеша

// TTL = 0 (вимкнути кеш)
await completeCached(messages, { cacheTtlSeconds: 0 })
// → { cached: false, ... }
```

---

## 🧪 Тести (як специфікація)

### `cache.test.ts` (6+)

Мокати `ioredis` через `vi.mock`.

1. `hashPrompt("abc")` → детермінований, 64 символи.
2. `hashPrompt("abc") === hashPrompt("abc")`.
3. `hashPrompt("abc") !== hashPrompt("abd")`.
4. `cacheSet` + `cacheGet` → round-trip.
5. `cacheGet` при Redis-помилці → `null`, не кидає.
6. `cacheSet` при Redis-помилці → не кидає.
7. `withCache` при cache hit → `fn` не викликається.
8. `withCache` при cache miss → `fn` викликається, результат кешується.

### `cached.test.ts` (4+)

Мокати `completeWithFallback` і `cacheGet`/`cacheSet`.

1. Cache miss → `completeWithFallback` викликано, результат з `cached: false`.
2. Cache hit → `completeWithFallback` НЕ викликано, результат з `cached: true`.
3. Ключ включає `model`, `temperature`, `responseFormat`.
4. `cacheTtlSeconds: 0` → не читає і не пише в кеш.
5. `messages` різні → різні ключі.
6. `options.timeoutMs` НЕ входить у ключ (2 різні timeout → той самий ключ).

---

## ⚠️ Нюанси (тільки хрупке)

### Singleton через globalThis

```ts
const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis = globalForRedis.redis ?? createRedisClient();
if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
```

### Створення клієнта

```ts
function createRedisClient(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    return new Redis({ lazyConnect: true, enableOfflineQueue: false })
      .on("error", () => {});
  }
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
  });
  client.on("error", (err) => console.warn("[redis] error:", err.message));
  return client;
}
```

### JSON round-trip з захистом

```ts
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable()) return null;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn("[redis] get/parse failed:", err);
    return null;
  }
}
```

### Формування ключа для AI

```ts
function buildCacheKey(messages: AIMessage[], options?: AICompletionOptions): string {
  const relevant = {
    messages,
    model: options?.model,
    temperature: options?.temperature,
    responseFormat: options?.responseFormat,
  };
  return `ai:${hashPrompt(JSON.stringify(relevant))}`;
}
```

**НЕ включати:** `timeoutMs`, `signal`, `cacheTtlSeconds`.

### Порт 6380, не 6379

Lingua використовує **6380** (Atlas займає 6379). У `.env.example`:
```
REDIS_URL=redis://localhost:6380
```

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 11 (Redis — ключі та структури)
- `docs/tasks/02-docker-compose.md`
- `docs/tasks/10-ai-provider-interface.md`
- `docs/tasks/11-openrouter-provider.md`
- `docs/tasks/12-gemini-deepseek-crosscheck.md`
- `AGENT_RULES.md` → розділ 7.5 (робота з Redis)

---

## 💬 Commit message

```
feat(cache): add Redis cache layer for AI completions

- add redis/client.ts singleton with graceful degradation
- add redis/cache.ts with cacheGet, cacheSet, withCache, hashPrompt
- add ai/cached.ts completeCached wrapper
- add 12 unit tests with mocked ioredis and AI
- add REDIS_URL (port 6380) to .env.example
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/13-redis-cache
# ...
git add .
git commit -m "feat(cache): add Redis cache layer for AI completions"
git push origin feat/13-redis-cache
```

---

## 📝 Нотатки

Заповнюється після завершення.

- Чи варто кешувати divergent-результати cross-check? (поки ні)
- Чи потрібен fallback на дефолт `redis://localhost:6380`?
- Чи потрібно логувати cache hit/miss для метрик?
- Чи правильно визначається `isRedisAvailable()` при lazy connect?