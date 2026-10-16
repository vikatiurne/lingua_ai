# 14 — Rate Limiting Middleware

**Епік:** E3 — AI & Cache
**Розмір:** S (1–2 год)
**Залежності:** 13
**Статус:** ⬜ Todo
**Гілка:** `feat/14-rate-limiting`

> ⚠️ **ЦЯ ЗАДАЧА — ОБМЕЖЕННЯ ЗАПИТІВ.**
> Redis-клієнт готовий (задача 13). Тепер лічильники + middleware для API-роутів.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Автентифікація (задача 15) — поки що ключ = IP
> - Конкретні API-роути (задачі 19+)
> - UI
> - Кеш AI (задача 13)

---

## 🎯 Мета

Після завершення задачі:
- Є функція `checkRateLimit(key, limit, windowSec)` — INCR + EXPIRE
- Є middleware `withRateLimit(handler, options)` для Next.js API-роутів
- Є стандартні ліміти: AI — 10/хв, API — 100/хв, AUTH — 5/хв
- При перевищенні → 429 з заголовками `Retry-After`, `X-RateLimit-*`
- Якщо Redis недоступний — пропустити перевірку (fail-open)

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/lib/redis/rate-limit.ts`
- [ ] Є `apps/web/lib/api/with-rate-limit.ts`
- [ ] Є `apps/web/lib/redis/rate-limit.test.ts` — 6+ тестів
- [ ] Є `apps/web/lib/api/with-rate-limit.test.ts` — 5+ тестів
- [ ] `checkRateLimit` використовує `INCR` + `EXPIRE` атомарно
- [ ] `withRateLimit` повертає 429 при перевищенні
- [ ] Заголовки: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`
- [ ] При Redis недоступному — пропуск (fail-open)
- [ ] `RATE_LIMITS` константа з лімітами (AI, API, AUTH)
- [ ] IP витягується з `x-forwarded-for` або `x-real-ip` (не з `req.ip`, якого немає в App Router)
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Прив'язка до `userId` (поки що `ip`) — окрема задача після 15
- ❌ Складна логіка: sliding window, leaky bucket
- ❌ Блокування на рівні Nginx / Cloudflare
- ❌ Whitelist для адмінів
- ❌ Prometheus-метрики
- ❌ Збереження порушень у БД
- ❌ Env `RATE_LIMIT_ENABLED` (не потрібно — fail-open уже вирішує)

---

## 📁 Файли

### Створити

- `apps/web/lib/redis/rate-limit.ts`
- `apps/web/lib/redis/rate-limit.test.ts`
- `apps/web/lib/api/with-rate-limit.ts`
- `apps/web/lib/api/with-rate-limit.test.ts`

### Не чіпати

- `apps/web/lib/redis/client.ts`, `cache.ts` — створені в задачі 13
- `apps/web/lib/ai/**`
- `packages/shared/**`
- Prisma

---

## 🔧 Інтерфейси (обов'язково)

### `lib/redis/rate-limit.ts`

```ts
export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp (seconds)
  retryAfter?: number; // seconds до reset, якщо not allowed
};

export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult>;

export const RATE_LIMITS: {
  AI: { limit: number; windowSeconds: number; keyPrefix: string };
  API: { limit: number; windowSeconds: number; keyPrefix: string };
  AUTH: { limit: number; windowSeconds: number; keyPrefix: string };
};
```

### `lib/api/with-rate-limit.ts`

```ts
import type { NextRequest } from "next/server";

export type RateLimitOptions = {
  limit: number;
  windowSeconds: number;
  keyPrefix: string;
  identifier?: (req: NextRequest) => string; // default: IP з headers
};

export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  options: RateLimitOptions
): (req: NextRequest) => Promise<Response>;
```

---

## 🧠 Алгоритм (словами)

### `checkRateLimit(key, limit, windowSec)`

1. Якщо Redis недоступний → `{ allowed: true, limit, remaining: limit, resetAt: 0 }` (fail-open).
2. `currentCount = await redis.incr(key)`.
3. Якщо `currentCount === 1` → `redis.expire(key, windowSec)`.
4. `ttl = await redis.ttl(key)`.
5. `resetAt = Math.floor(Date.now() / 1000) + ttl`.
6. Якщо `currentCount <= limit`:
   - `{ allowed: true, limit, remaining: limit - currentCount, resetAt }`.
7. Інакше:
   - `{ allowed: false, limit, remaining: 0, resetAt, retryAfter: ttl }`.

**Атомарність:** `INCR` + `EXPIRE` — дві команди. При падінні між ними — ключ без TTL, але рідко. Для повної атомарності — Lua. Поки що достатньо.

### `withRateLimit(handler, options)`

1. Витягти identifier:
   - `options.identifier?.(req)` → якщо вказано.
   - Інакше → `getClientIp(req)`.
2. `key = \`ratelimit:${options.keyPrefix}:${identifier}\``.
3. `result = await checkRateLimit(key, options.limit, options.windowSeconds)`.
4. Додати до відповіді заголовки:
   - `X-RateLimit-Limit: ${result.limit}`
   - `X-RateLimit-Remaining: ${result.remaining}`
   - `X-RateLimit-Reset: ${result.resetAt}`
5. Якщо `!result.allowed`:
   - Повернути `Response` 429 з `Retry-After: ${result.retryAfter}` + заголовки.
6. Інакше — викликати `handler(req)`, додати заголовки до відповіді.

### `getClientIp(req)`

```ts
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
```

**`req.ip`** у Next.js App Router **не існує**. Тільки headers.

---

## 🔬 Приклади входу/виходу

```ts
// Перший запит — 1/10
await checkRateLimit("ratelimit:ai:1.2.3.4", 10, 60)
// → { allowed: true, limit: 10, remaining: 9, resetAt: 1712345678 }

// 10-й запит
// → { allowed: true, limit: 10, remaining: 0, resetAt: 1712345678 }

// 11-й запит
// → { allowed: false, limit: 10, remaining: 0, resetAt: 1712345678, retryAfter: 42 }

// Redis недоступний
// → { allowed: true, limit: 10, remaining: 10, resetAt: 0 }
```

Response headers при успіху:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1712345678
```

Response headers при 429:
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1712345678
Retry-After: 42
```

---

## 🧪 Тести (як специфікація)

### `rate-limit.test.ts` (6+)

Мокати `ioredis`.

1. Перший запит → `allowed: true`, `remaining: limit - 1`.
2. 11-й запит при limit=10 → `allowed: false`, `retryAfter > 0`.
3. `EXPIRE` встановлюється тільки при `INCR === 1`.
4. Redis недоступний → `allowed: true`, `remaining: limit`.
5. `resetAt` — майбутній timestamp.
6. Ключі різних prefixів не змішуються.

### `with-rate-limit.test.ts` (5+)

Мокати `checkRateLimit` (з `./rate-limit`).

1. Успіх → `handler` викликано, заголовки додані.
2. `allowed: false` → 429, `handler` НЕ викликано.
3. `identifier` — кастомна функція → використовується її результат.
4. `x-forwarded-for` header → витягується IP.
5. Заголовки присутні і в успішній, і в 429-відповіді.

---

## ⚠️ Нюанси (тільки хрупке)

### INCR + EXPIRE

```ts
const currentCount = await redis.incr(key);
if (currentCount === 1) {
  await redis.expire(key, windowSeconds);
}
const ttl = await redis.ttl(key);
```

**Не робити:**
```ts
// ❌ Перезаписує TTL при кожному запиті — sliding window
await redis.set(key, count + 1, "EX", windowSeconds);
```

**Чому:** фіксоване вікно простіше і дешевше. Sliding window — окрема задача.

### Витяг IP у Next.js

`req.ip` у Next.js App Router — **недоступно**. Тільки `headers`.

### Заголовки у Response

```ts
const response = await handler(req);
const headers = new Headers(response.headers);
headers.set("X-RateLimit-Limit", String(result.limit));
headers.set("X-RateLimit-Remaining", String(result.remaining));
headers.set("X-RateLimit-Reset", String(result.resetAt));

if (!result.allowed) {
  headers.set("Retry-After", String(result.retryAfter ?? 60));
  return new Response("Too Many Requests", { status: 429, headers });
}

return new Response(response.body, {
  status: response.status,
  statusText: response.statusText,
  headers,
});
```

### Fail-open, не fail-closed

Якщо Redis впав — **пропустити** запит. Це свідомий вибір:
- Користувач не страждає.
- Ліміти безкоштовних AI-моделей все одно спрацюють на стороні провайдера.
- Альтернатива (fail-closed) — сайт недоступний, якщо Redis впав.

### Redis на порту 6380

Той самий, що в задачі 13. `.env` містить `REDIS_URL=redis://localhost:6380`.

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 11 (Redis — ключі)
- `docs/tasks/13-redis-cache.md`
- `AGENT_RULES.md` → розділ 7.5 (робота з Redis)

---

## 💬 Commit message

```
feat(api): add rate limiting middleware

- add redis/rate-limit.ts with checkRateLimit (INCR + EXPIRE)
- add api/with-rate-limit.ts wrapper for Next.js route handlers
- add RATE_LIMITS constants: AI 10/min, API 100/min, AUTH 5/min
- add standard headers: X-RateLimit-*, Retry-After
- add fail-open when Redis unavailable
- extract IP from x-forwarded-for / x-real-ip headers
- add 11 unit tests with mocked ioredis
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/14-rate-limiting
# ...
git add .
git commit -m "feat(api): add rate limiting middleware"
git push origin feat/14-rate-limiting
```

---

## 📝 Нотатки

Заповнюється після завершення.

- Чи потрібен sliding window замість fixed?
- Чи варто логувати 429 у консоль?
- Чи потрібен окремий ліміт для cross-check (він робить 2 запити)?
- Чи коректно витягується IP з різних proxy конфігурацій?