# 15 — NextAuth Setup (Credentials + JWT)

**Епік:** E4 — Auth & Users
**Розмір:** M (2–3 год)
**Залежності:** 06, 13, 14
**Статус:** ⬜ Todo
**Гілка:** `feat/15-nextauth-setup`

> ⚠️ **ЦЯ ЗАДАЧА — БАЗОВА АВТЕНТИФІКАЦІЯ.**
> Prisma User готовий (задача 06). Rate limiting готовий (задача 14).
> Тепер — NextAuth з Credentials provider і **JWT-сесіями** (без adapter!).
>
> ⚠️ **ЧОМУ БЕЗ ADAPTER:**
> Adapter вимагає таблиць `Account`, `Session`, `VerificationToken`.
> З JWT-сесіями вони не потрібні. Це простіше і швидше.
> Міграція на adapter — окрема задача, якщо колись знадобиться OAuth.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - UI login/register (задача 16)
> - User helpers, session callback (задача 17)
> - OAuth (Google, GitHub) — пізніше
> - Email verification
> - Password reset

---

## 🎯 Мета

Після завершення задачі:
- Є NextAuth з Credentials provider (email + password)
- Сесії — JWT, cookie `next-auth.session-token`
- `signIn("credentials", { email, password })` повертає сесію або помилку
- `getServerSession(authOptions)` працює у Server Components і API-роутах
- Пароль перевіряється через `bcrypt.compare`
- Rate limiting на `/api/auth/callback/credentials`

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/lib/auth/config.ts` — `authOptions`
- [ ] Є `apps/web/app/api/auth/[...nextauth]/route.ts` — handler
- [ ] Є `apps/web/lib/auth/password.ts` — `hashPassword`, `verifyPassword`
- [ ] Є `apps/web/types/next-auth.d.ts` — розширення `Session` і `JWT`
- [ ] Credentials provider приймає `email` + `password`
- [ ] `authorize()` шукає User за email, перевіряє пароль через bcrypt
- [ ] При невірних даних → `null` (NextAuth поверне 401)
- [ ] JWT-сесія містить `user.id` і `user.email`
- [ ] `NEXTAUTH_SECRET` і `NEXTAUTH_URL` у `.env`
- [ ] Endpoint `/api/auth/session` повертає поточну сесію
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ UI (задача 16)
- ❌ Session callback з level (задача 17)
- ❌ OAuth (Google/GitHub)
- ❌ Adapter і таблиці `Account`, `Session`, `VerificationToken`
- ❌ Password reset, email verification
- ❌ 2FA

---

## 📁 Файли

### Створити
- `apps/web/lib/auth/config.ts`
- `apps/web/lib/auth/password.ts`
- `apps/web/lib/auth/password.test.ts`
- `apps/web/app/api/auth/[...nextauth]/route.ts`
- `apps/web/types/next-auth.d.ts`

### Змінити
- `.env.example` — додати `NEXTAUTH_SECRET=`, `NEXTAUTH_URL=`
- `apps/web/package.json` — додати `next-auth`, `bcryptjs`, `@types/bcryptjs`

---

## 🔧 Інтерфейси

### `password.ts`

```ts
export function hashPassword(plain: string): Promise<string>;
export function verifyPassword(plain: string, hash: string): Promise<boolean>;
```

### `types/next-auth.d.ts`

```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
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
  }
}
```

### `config.ts`

```ts
import type { NextAuthOptions } from "next-auth";
export const authOptions: NextAuthOptions;
```

---

## 🧠 Алгоритм (словами)

### `hashPassword(plain)`
1. `bcrypt.hash(plain, 10)` → повернути.

### `verifyPassword(plain, hash)`
1. `bcrypt.compare(plain, hash)` → повернути.

### `authOptions`

**Strategy:**
```ts
session: { strategy: "jwt" }
```

**Pages:**
```ts
pages: {
  signIn: "/login",
  error: "/login",
}
```

**Providers:**
```ts
CredentialsProvider({
  name: "credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials.password) return null;
    const user = await prisma.user.findUnique({ where: { email: credentials.email } });
    if (!user || !user.passwordHash) return null;
    const valid = await verifyPassword(credentials.password, user.passwordHash);
    if (!valid) return null;
    return { id: user.id, email: user.email, name: user.name ?? undefined };
  },
})
```

**Callbacks:**
- `jwt({ token, user })`: якщо є `user` → `token.id = user.id`. Повернути `token`.
- `session({ session, token })`: `session.user.id = token.id`. Повернути `session`.

**Secret:** `process.env.NEXTAUTH_SECRET`.

**Session maxAge:** 30 днів.

### `app/api/auth/[...nextauth]/route.ts`

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### Rate limiting

Опційно: обгорнути POST-хендлер через `withRateLimit` з ключем `RATE_LIMITS.AUTH`. Якщо обгортання ускладнює NextAuth — винести в окрему задачу. **Мінімум:** не блокувати NextAuth rate limit-ом, який конфліктує з його внутрішньою логікою.

**Рішення:** залишити без rate limit на цьому етапі, додати в окремій задачі 15.1, якщо потрібно.

---

## 🔬 Приклади входу/виходу

```ts
// Хешування
await hashPassword("secret123")
// → "$2a$10$abcdefghijklmnopqrstuv..."

// Перевірка
await verifyPassword("secret123", hash)  // → true
await verifyPassword("wrong", hash)      // → false

// У Server Component
const session = await getServerSession(authOptions);
// session?.user.id → "clx..."

// Через API
POST /api/auth/callback/credentials
body: { email: "user@example.com", password: "secret123" }
// → Set-Cookie: next-auth.session-token=...
// → { url: "http://localhost:3001/" }
```

---

## 🧪 Тести (як специфікація)

### `password.test.ts` (4+)

1. `hashPassword` → рядок довжиною 60, починається з `$2a$` або `$2b$`.
2. `verifyPassword` з правильним паролем → `true`.
3. `verifyPassword` з неправильним → `false`.
4. Два виклики `hashPassword` з тим самим паролем → різні хеші (salt).

### Інтеграційний тест (окремо)

Створити User у БД з відомим `passwordHash`, викликати `authorize()` напряму:
1. Правильні credentials → повертає `{ id, email, name }`.
2. Невірний email → `null`.
3. Невірний пароль → `null`.
4. User без `passwordHash` → `null`.

> Тест на БД — з реальною тестовою БД або мок `prisma`. Мінімум — 4 кейси.

---

## ⚠️ Нюанси (тільки хрупке)

### `NEXTAUTH_URL` на :3001

```
NEXTAUTH_URL=http://localhost:3001
```

Next.js працює на :3001, а не :3000. Це критично для cookie.

### Генерація `NEXTAUTH_SECRET`

```bash
openssl rand -base64 32
```

Результат → у `.env`. **Ніколи не комітити.**

### Типи `next-auth.d.ts`

Файл має бути в `apps/web/types/` (не в `lib/`), щоб Next.js його підхопив. Оновити `tsconfig.json` `include`, якщо потрібно.

### `authorize()` повертає `null`, а не кидає

NextAuth очікує `null` при невдачі. Кидання призводить до 500.

### bcryptjs vs bcrypt

Використовуємо **`bcryptjs`** (чистий JS, без native-залежностей). Працює всюди, повільніше на 20–30%, не критично.

### Не використовувати adapter

Якщо додати `@auth/prisma-adapter`, NextAuth вимагатиме таблиць `Account`, `Session`. **Не додавати.** JWT-сесій достатньо.

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 6 (стек)
- `docs/tasks/06-prisma-schema.md` (модель `User` з `passwordHash`)
- `docs/tasks/14-rate-limiting.md`

---

## 💬 Commit message

```
feat(auth): add NextAuth with credentials and JWT sessions

- add lib/auth/config.ts with CredentialsProvider and JWT strategy
- add lib/auth/password.ts with bcryptjs hash/verify
- add types/next-auth.d.ts extending Session and JWT
- add app/api/auth/[...nextauth]/route.ts handler
- add NEXTAUTH_SECRET and NEXTAUTH_URL to .env.example
- add 4 unit tests for password helpers
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/15-nextauth-setup
# ...
git add .
git commit -m "feat(auth): add NextAuth with credentials and JWT sessions"
git push origin feat/15-nextauth-setup
```

---

## 📝 Нотатки

- Чи потрібен OAuth у MVP? (поки ні)
- Чи треба міняти `next-auth` на `@auth/core` v5? (поки ні, v4 стабільніша)
- Rate limiting на `/api/auth/*` — окремою задачею?