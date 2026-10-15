# 01 — Monorepo Setup (pnpm + Turborepo)

**Епік:** E1 — Foundation
**Розмір:** M (2–3 год)
**Залежності:** немає
**Статус:** ⬜ Todo
**Гілка:** `feat/01-monorepo-setup`

> ⚠️ **ЦЯ ЗАДАЧА НЕ ТОРКАЄТЬСЯ:**
> - `docker-compose.yml`, `docker/`, `.env` (задача 02)
> - `apps/cms/Dockerfile`, `apps/cms/src/`, `apps/cms/config/` (задача 02)
> - Prisma, БД, AI, Redis (задачі 06, 10–14)
>
> **Створюється тільки каркас монорепо.**

---

## 🎯 Мета

Після завершення задачі є монорепо з pnpm workspaces + Turborepo.
`apps/web` — Next.js 14 з Tailwind. `apps/cms` — заглушка. `packages/shared` — TS-бібліотека.
Команди `pnpm dev:web`, `pnpm typecheck`, `pnpm build` працюють.

---

## ✅ Acceptance Criteria

- [ ] Є `package.json` у корені з `packageManager: pnpm@9`
- [ ] Є `pnpm-workspace.yaml` з `apps/*` і `packages/*`
- [ ] Є `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.nvmrc`, `.editorconfig`
- [ ] `apps/web` — Next.js 14 App Router + TypeScript + Tailwind
- [ ] `apps/cms/package.json` — заглушка (без Strapi)
- [ ] `packages/shared` — TypeScript-пакет з `src/index.ts`
- [ ] `pnpm install` проходить
- [ ] `pnpm typecheck` проходить
- [ ] `pnpm dev:web` → Next.js на :3001
- [ ] Імпорт `import { X } from "@lingua/shared"` у `apps/web` працює

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Strapi, Docker Compose (задача 02)
- ❌ Prisma (задача 06)
- ❌ Єнуми/типи у `packages/shared` (задача 05)
- ❌ AI, Redis (задачі 10–14)
- ❌ shadcn/ui (задача 29)

---

## 📁 Файли

### Створити в корені
- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `.gitignore`
- `.nvmrc`
- `tsconfig.base.json`
- `.editorconfig`

### `apps/web/`
- `package.json`
- `next.config.mjs`
- `tsconfig.json`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`

> Стандартні файли Next.js (`layout.tsx`, `page.tsx`, `globals.css`, `tailwind.config.ts`, `postcss.config.mjs`) — створити за офіційним шаблоном. Без кастомізації.

### `apps/cms/`
- `package.json` — заглушка:
```json
{
  "name": "cms",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "develop": "echo 'Strapi will be installed in task 02'",
    "build": "echo 'noop'",
    "typecheck": "echo 'noop'"
  }
}
```

### `packages/shared/`
- `package.json`
- `tsconfig.json`
- `src/index.ts` — поки що `export const SHARED_PACKAGE_VERSION = "0.0.0";`

---

## 🔧 Хрупкі конфіги (обов'язково)

### `package.json` (корінь)
```json
{
  "name": "lingua-ai",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:cms": "pnpm --filter cms develop",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

### `pnpm-workspace.yaml`
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {},
    "dev": { "cache": false, "persistent": true }
  }
}
```

### `tsconfig.base.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### `packages/shared/package.json`
```json
{
  "name": "@lingua/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "typecheck": "tsc --noEmit" },
  "devDependencies": { "typescript": "^5.4.0" }
}
```

### `apps/web/package.json` (скорочено)
```json
{
  "name": "web",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "typecheck": "tsc --noEmit",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@lingua/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0"
  }
}
```

### `apps/web/next.config.mjs` (важливо!)
```js
const nextConfig = {
  transpilePackages: ["@lingua/shared"],
};
export default nextConfig;
```

### `apps/web/tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "noEmit": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next"]
}
```

---

## 🧪 Як перевірити

```bash
pnpm install
pnpm typecheck        # без помилок
pnpm dev:web          # http://localhost:3001
pnpm build            # успішно
```

У `page.tsx` тимчасово:
```tsx
import { SHARED_PACKAGE_VERSION } from "@lingua/shared";
export default function Home() {
  return <h1>Lingua AI — {SHARED_PACKAGE_VERSION}</h1>;
}
```

---

## ⚠️ Нюанси

- `pnpm-workspace.yaml` — критичний для розпізнавання `apps/*` і `packages/*`.
- `transpilePackages: ["@lingua/shared"]` — обов'язково, інакше Next.js не збере TS-пакет з кореня.
- `paths: { "@/*": ["./*"] }` — для абсолютних імпортів всередині `apps/web`.
- `.nvmrc` = `22`.

---

## 📎 Контекст
- `00_CONTEXT.md` → розділи 6, 7, 8

---

## 💬 Commit message
```
chore(monorepo): setup pnpm workspaces and turborepo

- add root package.json with pnpm@9 and turbo
- add pnpm-workspace.yaml, turbo.json, tsconfig.base.json
- add apps/web (Next.js 14 App Router + Tailwind)
- add apps/cms placeholder
- add packages/shared placeholder
```

---

## 🔀 Git workflow
```bash
git checkout -b feat/01-monorepo-setup
# ...
git add .
git commit -m "chore(monorepo): setup pnpm workspaces and turborepo"
git push origin feat/01-monorepo-setup
```