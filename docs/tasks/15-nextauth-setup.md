# 15 — NextAuth Setup (Credentials + JWT)

**Епік:** E4 — Auth & Users
**Розмір:** M (2–3 год)
**Залежності:** 06, 13, 14
**Статус:** ✅ Done
**Гілка:** `feat/15-nextauth-setup`

> ⚠️ **ЦЯ ЗАДАЧА — БАЗОВА АВТЕНТИФІКАЦІЯ.**
> Prisma User готовий (задача 06). Rate limiting готовий (задача 14).
> Тепер — NextAuth з Credentials provider і **JWT-сесіями** (без adapter).
>
> ⚠️ **ЧОМУ БЕЗ ADAPTER:**
> Adapter вимагає таблиць `Account`, `Session`, `VerificationToken`.
> З JWT-сесіями вони не потрібні. Це простіше і швидше.
> Міграція на adapter — окрема задача, якщо знадобиться OAuth.
>
> ⚠️ **ВИКОРИСТОВУЄМО NextAuth v4** (стабільний), не v5 (Auth.js beta).
> Не встановлювати `next-auth@beta`, `@auth/prisma-adapter`.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - UI login/register (задача 16)
> - User helpers, session callback з level (задача 17)
> - OAuth (Google, GitHub) — пізніше
> - Email verification
> - Password reset

---

## 🎯 Мета

Після завершення:
- Є NextAuth з Credentials provider (email + password)
- Сесії — JWT, cookie `next-auth.session-token`
- `signIn("credentials", { email, password })` повертає сесію або помилку
- `getServerSession(authOptions)` працює у Server Components і API-роутах
- Пароль перевіряється через `bcryptjs`

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/lib/auth/config.ts` — `authOptions`
- [ ] Є `apps/web/lib/auth/password.ts` — `hashPassword`, `verifyPassword`
- [ ] Є `apps/web/lib/auth/password.test.ts` — 4+ тестів
- [ ] Є `apps/web/app/api/auth/[...nextauth]/route.ts` — handler (GET + POST)
- [ ] Є `apps/web/types/next-auth.d.ts` — розширення `Session` і `JWT` (id, email)
- [ ] Credentials provider приймає `email` + `password`
- [ ] `authorize()` шукає User за email, перевіряє пароль через `bcryptjs.compare`
- [ ] При невірних даних → `null` (NextAuth поверне 401)
- [ ] JWT-сесія містить `user.id` і `user.email`
- [ ] `NEXTAUTH_SECRET` і `NEXTAUTH_URL` у `.env`
- [ ] `NEXTAUTH_URL=http://localhost:3001` (порт web, не 3000)
- [ ] Endpoint `/api/auth/session` повертає `{}` без сесії і `{ user: {...} }` з сесією
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ UI (задача 16)
- ❌ Session callback з `level` і `targetLevel` (задача 17)
- ❌ OAuth (Google/GitHub)
- ❌ Adapter і таблиці `Account`, `Session`, `VerificationToken`
- ❌ Password reset, email verification
- ❌ 2FA
- ❌ Rate limit на `/api/auth/*` (окремо, якщо потрібно)
- ❌ Middleware для захисту роутів (задача 17)

---

## 📁 Файли

### Створити

- `apps/web/lib/auth/config.ts`
- `apps/web/lib/auth/password.ts`
- `apps/web/lib/auth/password.test.ts`
- `apps/web/app/api/auth/[...nextauth]/route.ts`
- `apps/web/types/next-auth.d.ts`

### Змінити

- `.env.example` (корінь) — додати `NEXTAUTH_SECRET=` і `NEXTAUTH_URL=http://localhost:3001`
- `apps/web/package.json` — додати `next-auth@^4`, `bcryptjs`, `@types/bcryptjs`
- `apps/web/tsconfig.json` — перевірити, що `types/` включено (має бути за замовчуванням)

### Не чіпати

- `apps/web/lib/ai/**`, `apps/web/lib/redis/**`
- `apps/web/lib/db/client.ts` — тільки імпорт
- `packages/shared/**`
- `apps/cms/**`

---

## 🔧 Інтерфейси (обов'язково)

### `password.ts`

```ts
export function hashPassword(plain: string): Promise<string>;
export function verifyPassword(plain: string, hash: string): Promise<boolean>;
```

### `config.ts`

```ts
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions;
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

---

## 🧠 Алгоритм (словами)

### `hashPassword(plain)`

```ts
return bcrypt.hash(plain, 10);
```

### `verifyPassword(plain, hash)`

```ts
return bcrypt.compare(plain, hash);
```

### `authOptions`

**Strategy:**
```ts
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 днів
}
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

    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
    });

    if (!user || !user.passwordHash) return null;

    const valid = await verifyPassword(credentials.password, user.passwordHash);
    if (!valid) return null;

    return { id: user.id, email: user.email, name: user.name ?? undefined };
  },
})
```

**Callbacks:**
```ts
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.id;
    }
    return session;
  },
}
```

**Secret:**
```ts
secret: process.env.NEXTAUTH_SECRET,
```

### `app/api/auth/[...nextauth]/route.ts`

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

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
GET /api/auth/session
// Без cookie → {}
// З cookie → { user: { id, email, name }, expires: "..." }
```

---

## 🧪 Тести (як специфікація)

### `password.test.ts` (4+)

1. `hashPassword` → рядок довжиною 60, починається з `$2a$` або `$2b$`.
2. `verifyPassword` з правильним паролем → `true`.
3. `verifyPassword` з неправильним → `false`.
4. Два виклики `hashPassword` з тим самим паролем → різні хеші (salt).

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("hashes password with bcrypt format", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).toMatch(/^\$2[ab]\$\d{2}\$.{53}$/);
  });

  it("verifies correct password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces different hashes for same password", async () => {
    const h1 = await hashPassword("secret123");
    const h2 = await hashPassword("secret123");
    expect(h1).not.toBe(h2);
  });
});
```

### Інтеграційний тест (окремо, не обов'язково)

Створити User у БД з відомим `passwordHash`, викликати `authorize()` напряму:
1. Правильні credentials → `{ id, email, name }`.
2. Невірний email → `null`.
3. Невірний пароль → `null`.
4. User без `passwordHash` → `null`.

---

## ⚠️ Нюанси (тільки хрупке)

### NEXTAUTH_URL на :3001

```
NEXTAUTH_URL=http://localhost:3001
```

Next.js працює на :3001 (не :3000). Це критично для cookie.

### Генерація NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Результат → у `.env`. **Ніколи не комітити.**

### NextAuth v4, не v5

```bash
pnpm add next-auth@^4.24.0
```

**Не** `next-auth@beta` (це Auth.js v5, інший API).

### bcryptjs vs bcrypt

Використовуємо **`bcryptjs`** (чистий JS, без native-залежностей). Працює всюди, повільніше на 20–30%, не критично.

### Типи `next-auth.d.ts`

Файл має бути в `apps/web/types/`. Перевірити, що `tsconfig.json` має `"include": ["**/*.ts", "**/*.tsx", ...]` — тоді підхопить автоматично.

### `authorize()` повертає `null`, а не кидає

NextAuth очікує `null` при невдачі. Кидання призводить до 500.

### Не використовувати adapter

Якщо додати `@auth/prisma-adapter`, NextAuth вимагатиме таблиць `Account`, `Session`. **Не додавати.** JWT-сесій достатньо.

### `session.user.id` у типі

Після розширення `types/next-auth.d.ts` — TypeScript бачить `session.user.id` як `string`. Без цього — `Property 'id' does not exist`.

### Перевірка `/api/auth/session`

```bash
# Без cookie
curl http://localhost:3001/api/auth/session
# → {}

# Після signIn (вручну через браузер)
# → { user: { id, email, name }, expires: "..." }
```

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

Заповнено після завершення (feat/15-nextauth-setup).

### Відповіді на питання задачі

- **Чи потрібен OAuth у MVP?** Поки ні. Credentials + JWT повністю покривають MVP. Adapter не підключали, тому міграція на OAuth (з таблицями `Account`, `Session`, `VerificationToken`) — окрема задача, коли знадобиться.
- **Чи спрацював `session.user.id` без `as string`?** Так. Після `types/next-auth.d.ts` TypeScript бачить `session.user.id: string`. Перевірено й runtime: `GET /api/auth/session` повернув `{"user":{"id":"...","email":"...","name":"..."},"expires":"..."}`.
- **Чи є проблеми з `NEXTAUTH_URL` при інших портах?** Ні, за умови оновлення. Next.js читає `.env` зі своєї директорії (`apps/web`), а не з кореня. `NEXTAUTH_URL=http://localhost:3001` збігається з `next dev -p 3001`. При зміні порту змінити і `NEXTAUTH_URL`, і скрипт `dev`/`start`.
- **Rate limiting на `/api/auth/*` — окремою задачею?** Так, out of scope. `/api/auth/*` без обмежень; окрема задача — після 17 (якщо знадобиться).

### Виявлені нюанси (відхилення від плану файлів)

- **`.env` читається не з кореня.** Задача вказувала змінити лише кореневий `.env.example`, але Next.js у `apps/web` читає `apps/web/.env`, тому `NEXTAUTH_SECRET`/`NEXTAUTH_URL` додані також у `apps/web/.env` та `apps/web/.env.example`. Кореневий `.env.example` теж оновлено (як просила задача) — для узгодженості документації. Дефолти однакові, тож плутанини немає.
- **`bcryptjs@3` має власні типи.** Пакет `@types/bcryptjs@3` — це deprecated stub («bcryptjs provides its own type definitions»). Доданий за вимогою задачі, реальної потреби немає. **Рішення:** прибрати з `apps/web/package.json` разом із задачею 16.

### Перевірено

- `pnpm typecheck` — OK (4/4 задачі).
- `pnpm --filter web test` — 101 тест пройшов, зокрема 4 `password.test.ts`.
- `pnpm build` — OK; `/api/auth/[...nextauth]` — dynamic route.
- Runtime (dev на :3001): без cookie `GET /api/auth/session` → `{}` (200); правильні credentials → сесія з `user.id`; невірний пароль → `POST /api/auth/callback/credentials` → 401, сесія `{}`.
- Тестовий користувач у БД створювався лише для перевірки входу й видалений після.

### Для наступних задач (16–17)

- Login/Register UI (16) → `pages.signIn = "/login"` вже вказано; форма викликає `signIn("credentials", { email, password })`.
- Session callback з `level`/`targetLevel` (17) — свідомо НЕ доданий (out of scope).