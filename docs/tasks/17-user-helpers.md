# 17 — User Helpers + Session Callback

**Епік:** E4 — Auth & Users
**Розмір:** S (1–2 год)
**Залежності:** 15, 16
**Статус:** ✅ Done
**Гілка:** `feat/17-user-helpers`

> ⚠️ **ЦЯ ЗАДАЧА — ЗРУЧНИЙ ДОСТУП ДО USER.**
> NextAuth і сторінки готові (задачі 15, 16). Тепер — helper'и для отримання
> користувача з сесії, middleware для захисту роутів, API `/api/user/me`.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Тест рівня (задачі 18–20)
> - Оновлення level після тесту (задача 20)
> - Профіль користувача (окремо)
> - Dashboard UI (задача 22)
> - Rate limit на `/api/user/me` (не потрібно)
>
> ⚠️ **`/dashboard` поки не існує** (задача 22). Middleware захищає його, але
> запит до `/dashboard` дасть 404 до задачі 22 — це нормально.

---

## 🎯 Мета

Після завершення задачі:
- Є `getCurrentUser()` — повертає User з БД або `null`
- Є `requireUser()` — кидає redirect на `/login`, якщо немає сесії
- Session callback у NextAuth підтягує `level` і `targetLevel` з БД
- Є middleware для захисту `/dashboard/*`, `/plan/*`, `/exercise/*`, `/progress/*`, `/calendar/*`
- Є `/api/user/me` — GET повертає профіль, PATCH оновлює `level`/`targetLevel`/`dailyMinutes`

---

## ✅ Acceptance Criteria

- [x] Є `apps/web/lib/auth/session.ts` — `getCurrentUser`, `requireUser`
- [x] Є `apps/web/lib/validation/user.ts` — Zod-схема для PATCH
- [x] Є `apps/web/lib/validation/user.test.ts` — 4+ тестів
- [x] Є `apps/web/app/api/user/me/route.ts` — GET + PATCH
- [x] Є `apps/web/middleware.ts` — захист маршрутів
- [x] Session callback повертає `session.user.level` і `session.user.targetLevel`
- [x] `requireUser()` викликає `redirect("/login")` при відсутності сесії
- [x]  Middleware захищає /dashboard, /test, /plan, /exercise, /progress, /calendar
- [x] `/api/user/me` повертає User без `passwordHash`
- [x] `PATCH /api/user/me` валідує `level` через `CEFR_LEVELS` з `@lingua/shared`
- [x] `types/next-auth.d.ts` розширено: `level`, `targetLevel` у `Session.user` і `JWT`
- [x] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Тест рівня (задачі 18–20)
- ❌ Автоматичне оновлення `level` при переході (задача 44)
- ❌ Видалення акаунта
- ❌ Зміна пароля
- ❌ Профільна сторінка `/profile` (тільки API)
- ❌ Rate limiting на `/api/user/me`
- ❌ Dashboard UI (задача 22) — middleware тільки захищає, контент буде пізніше

---

## 📁 Файли

### Створити

- `apps/web/lib/auth/session.ts`
- `apps/web/lib/validation/user.ts`
- `apps/web/lib/validation/user.test.ts`
- `apps/web/app/api/user/me/route.ts`
- `apps/web/middleware.ts`

### Змінити

- `apps/web/lib/auth/config.ts` — розширити `callbacks.session` і `callbacks.jwt`
- `apps/web/types/next-auth.d.ts` — додати `level`, `targetLevel` у `Session["user"]` і `JWT`

### Не чіпати

- `apps/web/lib/auth/password.ts`
- `apps/web/app/api/auth/**`
- `apps/web/app/(auth)/**`
- `apps/web/components/auth/**`
- `apps/web/lib/ai/**`, `apps/web/lib/redis/**`
- `packages/shared/**` — тільки імпорт
- `apps/cms/**`

---

## 🔧 Інтерфейси (обов'язково)

### `lib/auth/session.ts`

```ts
import type { User } from "@prisma/client";

export function getCurrentUser(): Promise<User | null>;
export function requireUser(): Promise<User>; // redirect("/login") if null
```

### `validation/user.ts`

```ts
import { z } from "zod";
import { CEFR_LEVELS } from "@lingua/shared";

export const updateUserSchema = z.object({
  level: z.enum(CEFR_LEVELS).optional(),
  targetLevel: z.enum(CEFR_LEVELS).optional(),
  dailyMinutes: z.number().int().min(5).max(240).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

### `types/next-auth.d.ts` (розширення)

```ts
import type { DefaultSession } from "next-auth";
import type { CEFRLevel } from "@lingua/shared";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      level: CEFRLevel | null;
      targetLevel: CEFRLevel | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    level?: CEFRLevel | null;
    targetLevel?: CEFRLevel | null;
  }
}
```

### `middleware.ts`

```ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/test/:path*",        
    "/plan/:path*",
    "/exercise/:path*",
    "/progress/:path*",
    "/calendar/:path*",
  ],
};
```

---

## 🧠 Алгоритм (словами)

### `getCurrentUser()`

1. `session = await getServerSession(authOptions)`.
2. Якщо немає `session?.user?.id` → `null`.
3. `user = await prisma.user.findUnique({ where: { id: session.user.id } })`.
4. Повернути `user` (може бути `null`, якщо видалений).

### `requireUser()`

1. `user = await getCurrentUser()`.
2. Якщо `null` → `redirect("/login")` (з `next/navigation`).
3. Повернути `user`.

### Session callback (у `authOptions`)

**`jwt({ token, user, trigger })`:**

1. Якщо є `user` (signIn) — `token.id = user.id`.
2. Якщо `trigger === "update"` або при кожному запиті — підтягнути з БД:
   ```ts
   const dbUser = await prisma.user.findUnique({
     where: { id: token.id },
     select: { level: true, targetLevel: true },
   });
   token.level = dbUser?.level ?? null;
   token.targetLevel = dbUser?.targetLevel ?? null;
   ```
3. Повернути `token`.

**`session({ session, token })`:**

1. `session.user.id = token.id`.
2. `session.user.level = token.level ?? null`.
3. `session.user.targetLevel = token.targetLevel ?? null`.
4. Повернути `session`.

**⚠️ Prisma в JWT callback:** працює, бо NextAuth v4 з JWT strategy — це API route, не Edge. Middleware (Edge) не викликає цей callback.

### `/api/user/me`

**GET:**
1. `user = await getCurrentUser()`.
2. Якщо `null` → 401 `{ error: "Unauthorized" }`.
3. Видалити `passwordHash`.
4. Повернути `{ user }`.

**PATCH:**
1. `user = await getCurrentUser()`.
2. Якщо `null` → 401.
3. `body = await req.json()`.
4. `parsed = updateUserSchema.safeParse(body)`.
5. Якщо fail → 400 `{ errors: parsed.error.flatten().fieldErrors }`.
6. `updated = await prisma.user.update({ where: { id: user.id }, data: parsed.data })`.
7. Видалити `passwordHash`.
8. Повернути `{ user: updated }`.

### `middleware.ts`

`withAuth` автоматично редіректить на `/login`, якщо сесії немає. Ніякої кастомної логіки не потрібно.

---

## 🔬 Приклади входу/виходу

```ts
// У Server Component
const user = await getCurrentUser();
// user → { id, email, name, level: "B1", targetLevel: "B2", ... } | null

// У Server Component (захищений)
const user = await requireUser();
// user → той самий, але якщо null — redirect

// API
GET /api/user/me
→ 200 { user: { id, email, name, level: "B1", ... } } (без passwordHash)
→ 401 якщо не залогінений

PATCH /api/user/me
{ "level": "B1", "dailyMinutes": 45 }
→ 200 { user: { ..., level: "B1", dailyMinutes: 45 } }

PATCH /api/user/me
{ "level": "Z9" }
→ 400 { errors: { level: ["Invalid enum value..."] } }
```

---

## 🧪 Тести (як специфікація)

### `validation/user.test.ts` (4+)

1. `updateUserSchema` з валідним `level: "B1"` → success.
2. `updateUserSchema` з невалідним `level: "Z9"` → fail.
3. `updateUserSchema` з `dailyMinutes: 500` → fail (max 240).
4. `updateUserSchema` без полів → success (усі optional).
5. `updateUserSchema` з `dailyMinutes: 30.5` → fail (не integer).

### `session.test.ts` (4+, опційно)

Мокати `getServerSession` і `prisma`.

1. `getCurrentUser` без сесії → `null`.
2. `getCurrentUser` з сесією → повертає User.
3. `getCurrentUser` з сесією, але видаленим User → `null`.
4. `requireUser` без сесії → виклик `redirect("/login")` (mock).

---

## ⚠️ Нюанси (тільки хрупке)

### Session callback — 1 запит на рендер

Кожен рендер, що викликає `getServerSession`, виконує запит до БД у JWT callback. Це прийнятно для MVP, але треба пам'ятати про N+1 на кожен рендер. Оптимізація — задача 24.

### `redirect()` у `requireUser`

```ts
import { redirect } from "next/navigation";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
```

`redirect()` у Next.js App Router **кидає спеціальний виняток**. Функція після `redirect` не повертає значення — TypeScript це знає.

### `withAuth` middleware + App Router

Next.js middleware працює на Edge Runtime. Не можна використовувати Prisma тут. Тільки перевірка cookie/JWT — саме це робить `withAuth`.

### `matcher` не включає `/api/*`

Middleware захищає **сторінки**, не API. API-роути самі перевіряють сесію через `getCurrentUser`.

### Оновлення session після PATCH

Після PATCH `/api/user/me` — клієнт має викликати `router.refresh()` або `update()` з `useSession`, щоб session callback перезапустився.

### `z.enum` у Zod 4

Zod 4 приймає `readonly string[]` і сам зберігає literal union. Cast `as [string, ...string[]]` був потрібен лише для Zod 3 і ламає типи (звужує до `string`).

### Prisma в `callbacks.jwt`

JWT callback у NextAuth v4 запускається в API route (Node runtime), не в Edge. Prisma працює. Якщо виникне проблема — винести підтягування level у `session` callback або окремий хук.

### `/dashboard` поки 404

Middleware редіректить неавторизованих на `/login`. Авторизовані отримають 404, поки не з'явиться `app/(dashboard)/dashboard/page.tsx` (задача 22).

---

## 📎 Контекст

- `docs/tasks/15-nextauth-setup.md`
- `docs/tasks/16-auth-pages.md`
- `AGENT_RULES.md` → розділ 7.2 (єнуми), 7.6 (робота з БД)

---

## 💬 Commit message

```
feat(auth): add user helpers, session callback and /api/user/me

- add getCurrentUser and requireUser helpers
- extend session callback with level and targetLevel
- add /api/user/me GET and PATCH endpoints
- add middleware protecting dashboard routes
- add updateUserSchema Zod validation
- add 5 unit tests for user validation
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/17-user-helpers
# ...
git add .
git commit -m "feat(auth): add user helpers, session callback and /api/user/me"
git push origin feat/17-user-helpers
```

---

## 📝 Нотатки

Заповнюється після завершення.

- Чи працює Prisma у JWT callback без проблем?
  - Так. JWT callback виконується в Node-контексті API route (NextAuth v4, JWT strategy),
    а не на Edge. Запит `prisma.user.findUnique({ select: { level, targetLevel } })`
    додано напряму в `callbacks.jwt`. `pnpm typecheck` проходить.
- Чи не занадто повільно підтягувати level на кожен рендер?
  - Для MVP — прийнятно. Кожен `getServerSession` дає +1 запит до БД (N+1). Якщо стане
    вузьким місцем — кешувати `level`/`targetLevel` у Redis або оновлювати токен лише
    за `trigger === "update"`. Позначено як оптимізацію на майбутнє.
- Чи правильно `withAuth` редіректить на `/login` при відсутності cookie?
  - Налаштовано через `pages: { signIn: "/login" }`. `withAuth` перевіряє JWT cookie і
    редіректить на `/login` при відсутності/невалідності. Runtime не перевірявся
    (потрібен запущений застосунок із налаштованим `NEXTAUTH_SECRET`).
- Чи `redirect()` у `requireUser` працює без помилок у Server Components?
  - Так, це рекомендований патерн App Router. `redirect()` кидає спеціальний виняток,
    тому після нього `return user` виконується лише коли `user` існує.
- Чи треба rate limit на `/api/user/me`?
  - Ні. Endpoint працює лише для авторизованих; винесено в out of scope.

### Відхилення від специфікації

- У `validation/user.ts` використано `z.enum(CEFR_LEVELS)` без cast `as [string, ...string[]]`.
  Проєкт на Zod 4, де `z.enum` приймає `readonly string[]` і сам зберігає літеральний union
  (`CEFRLevel`). Cast до `[string, ...string[]]` звужував би тип до `string` і ламав би
  `prisma.user.update` (очікує `CEFRLevel`). Cast був потрібен лише для Zod 3.

### Перевірка

- `pnpm --filter web typecheck` — ✅ без помилок.
- `pnpm --filter web test` — ✅ 111 тестів, у т.ч. 5 нових у `validation/user.test.ts`.
- Runtime (браузер, реальна сесія) не перевірявся — потрібен запущений застосунок.