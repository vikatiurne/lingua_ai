# 16 — Auth Pages (Login + Register)

**Епік:** E4 — Auth & Users
**Розмір:** M (2–3 год)
**Залежності:** 14, 15
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
> - shadcn/ui (задача 29) — поки що прості Tailwind-компоненти
> - i18n (задача 45) — поки що українською

---

## 🎯 Мета

Після завершення задачі:
- Є сторінка `/register` — форма (email, password, name)
- Є сторінка `/login` — форма (email, password)
- Є `/api/auth/register` — створює User з хешованим паролем
- Після реєстрації — redirect на `/login?registered=1` з повідомленням
- Після входу — redirect на `/dashboard`
- Помилки валідації показуються під полями
- Rate limiting на `/api/auth/register` (5/хв)
- **Chore:** прибрати `@types/bcryptjs` з `apps/web/package.json` (bcryptjs@3 має власні типи)

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/lib/validation/auth.ts` — Zod-схеми
- [ ] Є `apps/web/lib/validation/auth.test.ts` — 5+ тестів
- [ ] Є `apps/web/app/(auth)/layout.tsx` — спільний layout для login/register
- [ ] Є `apps/web/app/(auth)/login/page.tsx`
- [ ] Є `apps/web/app/(auth)/register/page.tsx`
- [ ] Є `apps/web/app/api/auth/register/route.ts`
- [ ] Є `apps/web/components/auth/login-form.tsx`
- [ ] Є `apps/web/components/auth/register-form.tsx`
- [ ] Форми використовують `react-hook-form` + Zod resolver
- [ ] `/api/auth/register` хешує пароль через `hashPassword`
- [ ] Дублікат email → 409 з повідомленням
- [ ] Невалідний email/пароль → 400 з деталями
- [ ] `/api/auth/register` обгорнутий `withRateLimit(RATE_LIMITS.AUTH)`
- [ ] `signIn("credentials", { redirect: false })` → правильна обробка помилок
- [ ] `@types/bcryptjs` **видалено** з `apps/web/package.json`
- [ ] `.env.example` (корінь) і `apps/web/.env.example` синхронізовані
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ OAuth кнопки (Google, GitHub)
- ❌ "Забули пароль?"
- ❌ Email verification
- ❌ Редизайн / кастомна тема
- ❌ shadcn/ui (задача 29)
- ❌ i18n (задача 45) — поки що рядки українською в коді
- ❌ Middleware захисту роутів (задача 17)
- ❌ Rate limiting на `/api/auth/callback/credentials` (NextAuth)

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

- `apps/web/package.json` — додати `react-hook-form`, `@hookform/resolvers`, `zod`; **прибрати** `@types/bcryptjs`

### Не чіпати

- `apps/web/lib/auth/**`
- `apps/web/lib/ai/**`, `apps/web/lib/redis/**`
- `apps/web/types/next-auth.d.ts`
- `packages/shared/**`
- `apps/cms/**`

---

## 🔧 Інтерфейси (обов'язково)

### `validation/auth.ts`

```ts
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Невірний email"),
  password: z.string().min(8, "Мінімум 8 символів").max(72, "Максимум 72 символи"),
  name: z.string().min(1, "Введіть ім'я").max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Невірний email"),
  password: z.string().min(1, "Введіть пароль"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
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
3. Якщо `!parsed.success` → 400 `{ errors: parsed.error.flatten().fieldErrors }`.
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
→ 400 { "errors": { "email": ["Невірний email"], "password": ["Мінімум 8 символів"] } }

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

### Client components

Форми — `"use client"`. Сторінки `page.tsx` можуть бути Server Components, якщо не потрібен стан.

### `router.refresh()` після входу

Після `router.push("/dashboard")` — викликати `router.refresh()`, щоб session оновилась у Server Components.

### Next.js 14 `(auth)` група

Layout у `app/(auth)/layout.tsx` — спільний для `/login` і `/register`. Обгортка з центрованим блоком.

### Прибрати `@types/bcryptjs`

```bash
pnpm --filter web remove @types/bcryptjs
```

bcryptjs@3 має власні типи. Після видалення `pnpm typecheck` має залишитись зеленим.

---

## 📎 Контекст

- `docs/tasks/14-rate-limiting.md`
- `docs/tasks/15-nextauth-setup.md`
- `AGENT_RULES.md` → розділ 7.1 (чисті компоненти)

---

## 💬 Commit message

```
feat(auth): add login and register pages with validation

- add validation/auth.ts with Zod schemas
- add /register and /login pages with react-hook-form
- add /api/auth/register endpoint with bcrypt hashing
- rate limit register endpoint (5/min via RATE_LIMITS.AUTH)
- redirect to /dashboard after login
- remove deprecated @types/bcryptjs (bcryptjs@3 has own types)
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

Заповнюється після завершення.

- Чи спрацював `signIn` з `redirect: false` без reload?
- Чи є проблеми з Zod + react-hook-form типами?
- Чи правильно показуються помилки під полями?
- Чи потрібен `router.refresh()` для коректної роботи сесії?
- Чи не потрібен `@types/bcryptjs` (перевірити після видалення)?