# 17 — User Helpers + Session Callback

**Епік:** E4 — Auth & Users
**Розмір:** S (1–2 год)
**Залежності:** 15, 16
**Статус:** ⬜ Todo
**Гілка:** `feat/17-user-helpers`

> ⚠️ **ЦЯ ЗАДАЧА — ЗРУЧНИЙ ДОСТУП ДО USER.**
> NextAuth і сторінки готові (задачі 15, 16). Тепер — helper'и для отримання
> користувача з сесії, middleware для захисту роутів, API `/api/user/me`.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Тест рівня (задачі 18–20)
> - Оновлення level після тесту (задача 20)
> - Профіль користувача (окремо)
> - Dashboard UI (задача 21)

---

## 🎯 Мета

Після завершення задачі:
- Є `getCurrentUser()` — повертає User з БД або `null`
- Є `requireUser()` — кидає redirect на `/login`, якщо немає сесії
- Session callback у NextAuth підтягує `level` і `targetLevel` з БД
- Є middleware для захисту `/dashboard/*`, `/plan/*`, `/exercise/*`
- Є `/api/user/me` — GET повертає профіль, PATCH оновлює `level`/`targetLevel`/`dailyMinutes`

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/lib/auth/session.ts` — `getCurrentUser`, `requireUser`
- [ ] Є `apps/web/middleware.ts` — захист маршрутів
- [ ] Є `apps/web/app/api/user/me/route.ts` — GET + PATCH
- [ ] Є `apps/web/lib/validation/user.ts` — Zod-схема для PATCH
- [ ] Session callback повертає `session.user.level` і `session.user.targetLevel`
- [ ] `requireUser()` викликає `redirect("/login")` при відсутності сесії
- [ ] Middleware не пропускає неавторизованих на `/dashboard`, `/plan`, `/exercise`, `/progress`, `/calendar`
- [ ] `/api/user/me` повертає User без `passwordHash`
- [ ] `PATCH /api/user/me` валідує `level` через `CEFR_LEVELS` з `@lingua/shared`
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Тест рівня (задачі 18–20)
- ❌ Автоматичне оновлення `level` при переході (задача 44)
- ❌ Видалення акаунта
- ❌ Зміна пароля
- ❌ Профільна сторінка `/profile`

---

## 📁 Файли

### Створити
- `apps/web/lib/auth/session.ts`
- `apps/web/lib/validation/user.ts`
- `apps/web/app/api/user/me/route.ts`
- `apps/web/middleware.ts`

### Змінити
- `apps/web/lib/auth/config.ts` — розширити `session` callback
- `apps/web/types/next-auth.d.ts` — додати `level`, `targetLevel` у `Session["user"]` і `JWT`

---

## 🔧 Інтерфейси

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
  level: z.enum(CEFR_LEVELS as [string, ...string[]]).optional(),
  targetLevel: z.enum(CEFR_LEVELS as [string, ...string[]]).optional(),
  dailyMinutes: z.number().int().min(5).max(240).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

### `types/next-auth.d.ts` (розширення)

```ts
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      level: CEFRLevel | null;
      targetLevel: CEFRLevel | null;
    } & DefaultSession["user"];
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
export const config = {
  matcher: ["/dashboard/:path*", "/plan/:path*", "/exercise/:path*", "/progress/:path*", "/calendar/:path*"],
};

export default withAuth(...);
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
2. Якщо `null` → `redirect("/login")` (з `next-auth` або Next.js).
3. Повернути `user`.

### Session callback

Розширити `callbacks.session`:

1. Викликати базову логіку (`session.user.id = token.id`).
2. Додати `session.user.level = token.level ?? null`.
3. Додати `session.user.targetLevel = token.targetLevel ?? null`.
4. **Важливо:** для свіжих даних після зміни level — підтягнути з БД:
   - `user = await prisma.user.findUnique(...)`.
   - `session.user.level = user.level`.
   - Це робить 1 запит на кожен рендер сесії. Прийнятно для MVP.

**JWT callback:** `token.level` і `token.targetLevel` оновлюються при `signIn` і при явному оновленні через `updateSession()`.

### `/api/user/me`

**GET:**
1. `user = await getCurrentUser()`.
2. Якщо `null` → 401.
3. Видалити `passwordHash`.
4. Повернути `{ user }`.

**PATCH:**
1. `user = await getCurrentUser()`.
2. Якщо `null` → 401.
3. `body = await req.json()`.
4. `parsed = updateUserSchema.safeParse(body)`.
5. Якщо fail → 400.
6. `updated = await prisma.user.update({ where: { id: user.id }, data: parsed.data })`.
7. Видалити `passwordHash`.
8. Повернути `{ user: updated }`.

### `middleware.ts`

```ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [...],
};
```

`withAuth` автоматично редіректить на `/login`, якщо сесії немає.

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
→ 400 { error: "Invalid level" }
```

---

## 🧪 Тести (як специфікація)

### `session.test.ts` (4+)

Мокати `getServerSession` і `prisma`.

1. `getCurrentUser` без сесії → `null`.
2. `getCurrentUser` з сесією → повертає User.
3. `getCurrentUser` з сесією, але видаленим User → `null`.
4. `requireUser` без сесії → виклик `redirect("/login")` (mock).

### API tests (4+)

5. GET `/api/user/me` без сесії → 401.
6. GET `/api/user/me` з сесією → User без `passwordHash`.
7. PATCH з валідними даними → 200, User оновлено.
8. PATCH з невалідним `level` → 400.

---

## ⚠️ Нюанси (тільки хрупке)

### Session callback — 1 запит на рендер

Кожен рендер, що викликає `getServerSession`, виконує запит до БД. Це прийнятно для MVP, але треба пам'ятати про N+1 на кожен рендер. Оптимізація — задача 24.

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

### `CEFR_LEVELS` у Zod enum

```ts
z.enum(CEFR_LEVELS as [string, ...string[]])
```

Zod вимагає non-empty tuple. `CEFR_LEVELS` — `CEFRLevel[]`, тому cast обов'язковий.

---

## 📎 Контекст

- `docs/tasks/05-shared-package.md` (`CEFR_LEVELS`, `CEFRLevel`)
- `docs/tasks/15-nextauth-setup.md`
- `docs/tasks/16-auth-pages.md`
- `AGENT_RULES.md` → розділ 7.2 (єнуми)

---

## 💬 Commit message

```
feat(auth): add user helpers, session callback and /api/user/me

- add getCurrentUser and requireUser helpers
- extend session callback with level and targetLevel
- add /api/user/me GET and PATCH endpoints
- add middleware protecting dashboard routes
- add updateUserSchema Zod validation
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

- Чи варто кешувати User у JWT, щоб не робити запит на кожен рендер?
- Чи потрібен `/api/user/me` для Server Components? (ні, там `getCurrentUser()`)
- Чи потрібен rate limit на `/api/user/me`?