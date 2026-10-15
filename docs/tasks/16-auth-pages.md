# 16 — Auth Pages (Login + Register)

**Епік:** E4 — Auth & Users
**Розмір:** M (2–3 год)
**Залежності:** 15
**Статус:** ⬜ Todo
**Гілка:** `feat/16-auth-pages`

> ⚠️ **ЦЯ ЗАДАЧА — UI + API РЕЄСТРАЦІЇ ТА ВХОДУ.**
> NextAuth готовий (задача 15). Тепер — сторінки і `/api/auth/register`.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Session callback з level (задача 17)
> - Password reset, email verification
> - OAuth
> - Профіль користувача

---

## 🎯 Мета

Після завершення задачі:
- Є сторінка `/register` — форма (email, password, name)
- Є сторінка `/login` — форма (email, password)
- Є `/api/auth/register` — створює User з хешованим паролем
- Після реєстрації — redirect на `/login` з повідомленням
- Після входу — redirect на `/dashboard`
- Помилки валідації показуються під полями
- Rate limiting на `/api/auth/register` (5/хв)

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/app/(auth)/login/page.tsx`
- [ ] Є `apps/web/app/(auth)/register/page.tsx`
- [ ] Є `apps/web/app/api/auth/register/route.ts`
- [ ] Є `apps/web/lib/validation/auth.ts` — Zod-схеми
- [ ] Є `apps/web/components/auth/login-form.tsx` і `register-form.tsx`
- [ ] Форми використовують `react-hook-form` + Zod resolver
- [ ] `/api/auth/register` хешує пароль через `hashPassword`
- [ ] Дублікат email → 409 з повідомленням
- [ ] Невалідний email/пароль → 400 з деталями
- [ ] `/api/auth/register` обгорнутий `withRateLimit(RATE_LIMITS.AUTH)`
- [ ] `signIn("credentials", ...)` з `redirect: false` → правильна обробка помилок
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ OAuth кнопки (Google, GitHub)
- ❌ "Забули пароль?"
- ❌ Email verification
- ❌ Редизайн / кастомна тема
- ❌ shadcn/ui (задача 29, поки що прості Tailwind-компоненти)
- ❌ i18n (задача 45)

---

## 📁 Файли

### Створити
- `apps/web/lib/validation/auth.ts`
- `apps/web/lib/validation/auth.test.ts`
- `apps/web/app/(auth)/layout.tsx`
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(auth)/register/page.tsx`
- `apps/web/app/api/auth/register/route.ts`
- `apps/web/components/auth/login-form.tsx`
- `apps/web/components/auth/register-form.tsx`

### Змінити
- `apps/web/package.json` — додати `react-hook-form`, `@hookform/resolvers`, `zod`

---

## 🔧 Інтерфейси

### `validation/auth.ts`

```ts
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

### Форми

**Логін-форма (client component):**
```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";

// useForm({ resolver: zodResolver(loginSchema) })
// onSubmit: signIn("credentials", { ...data, redirect: false })
//   якщо ok → router.push("/dashboard")
//   якщо error → setError("root", { message: "Невірний email або пароль" })
```

**Реєстрація:**
```tsx
// POST /api/auth/register
// якщо ok → router.push("/login?registered=1")
// якщо 409 → setError("email", { message: "Email вже зареєстровано" })
```

### `api/auth/register/route.ts`

```ts
export const POST = withRateLimit(registerHandler, RATE_LIMITS.AUTH);

async function registerHandler(req: NextRequest): Promise<Response>;
```

---

## 🧠 Алгоритм (словами)

### `registerHandler(req)`

1. `body = await req.json()`.
2. `parsed = registerSchema.safeParse(body)`.
3. Якщо `!parsed.success` → 400 з `{ errors: parsed.error.flatten().fieldErrors }`.
4. `existing = await prisma.user.findUnique({ where: { email } })`.
5. Якщо існує → 409 `{ error: "Email already registered" }`.
6. `passwordHash = await hashPassword(password)`.
7. `user = await prisma.user.create({ data: { email, passwordHash, name } })`.
8. Повернути 201 `{ user: { id, email, name } }` (без `passwordHash`!).

### Login form `onSubmit`

1. `result = await signIn("credentials", { email, password, redirect: false })`.
2. Якщо `result?.error` → `setError("root", { message: "Невірний email або пароль" })`.
3. Інакше → `router.push("/dashboard"); router.refresh();`.

### Register form `onSubmit`

1. `res = await fetch("/api/auth/register", { method: "POST", body: JSON.stringify(data) })`.
2. Якщо 201 → `router.push("/login?registered=1")`.
3. Якщо 409 → `setError("email", { message: "Email вже зареєстровано" })`.
4. Якщо 400 → показати `errors` під відповідними полями.
5. Якщо 429 → показати "Занадто багато спроб, спробуйте пізніше".

---

## 🔬 Приклади входу/виходу

```
POST /api/auth/register
{ "email": "user@example.com", "password": "secret123", "name": "Іван" }
→ 201 { "user": { "id": "clx...", "email": "...", "name": "Іван" } }

POST /api/auth/register (повторно)
→ 409 { "error": "Email already registered" }

POST /api/auth/register
{ "email": "bad", "password": "123" }
→ 400 { "errors": { "email": ["Invalid email"], "password": ["String must contain at least 8 character(s)"] } }

POST /api/auth/register (11-й раз за хвилину)
→ 429 Too Many Requests
```

---

## 🧪 Тести (як специфікація)

### `validation/auth.test.ts` (5+)

1. `registerSchema` з валідними даними → success.
2. `registerSchema` з невалідним email → fail.
3. `registerSchema` з коротким паролем → fail.
4. `registerSchema` без name → success (name опційний).
5. `loginSchema` з порожнім паролем → fail.

### Інтеграційні (окремо, з мок-prisma)

6. `registerHandler` з новим email → 201, пароль захешовано.
7. `registerHandler` з існуючим email → 409.
8. `registerHandler` з невалідним body → 400.
9. `registerHandler` **не повертає** `passwordHash` у відповіді.

---

## ⚠️ Нюанси (тільки хрупке)

### `redirect: false` у `signIn`

```ts
const result = await signIn("credentials", {
  email,
  password,
  redirect: false,
});
if (result?.error) { /* ... */ }
```

Без `redirect: false` NextAuth кине redirect навіть при помилці.

### Zod + react-hook-form

```ts
useForm<LoginInput>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: "", password: "" },
});
```

### Не показувати `passwordHash` у відповіді

```ts
const { passwordHash: _, ...safeUser } = user;
return Response.json({ user: safeUser }, { status: 201 });
```

### Next.js 14 App Router + form actions

Використовуємо **client components** для форм із `react-hook-form`. Server Actions — окрема задача.

### `router.refresh()` після входу

Після `router.push("/dashboard")` — викликати `router.refresh()`, щоб session оновилась у Server Components.

---

## 📎 Контекст

- `docs/tasks/15-nextauth-setup.md`
- `docs/tasks/14-rate-limiting.md`
- `AGENT_RULES.md` → розділ 7.1 (чисті компоненти)

---

## 💬 Commit message

```
feat(auth): add login and register pages with validation

- add validation/auth.ts with Zod schemas
- add /register and /login pages with react-hook-form
- add /api/auth/register endpoint with bcrypt hashing
- rate limit register endpoint (5/min)
- redirect to /dashboard after login
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/16-auth-pages
# ...
git add .
git commit -m "feat(auth): add login and register pages with validation"
git push origin feat/16-auth-pages
```

---

## 📝 Нотатки

- Чи потрібна окрема сторінка "email підтверджено"?
- Чи використовувати Server Actions замість API route?
- Чи додавати "Remember me" checkbox?