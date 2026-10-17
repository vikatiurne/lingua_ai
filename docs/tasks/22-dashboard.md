# 22 — Dashboard

**Епік:** E6 — Plan
**Розмір:** M (2–3 год)
**Залежності:** 16.5, 17, 21
**Статус:** ✅ Done
**Гілка:** `feat/22-dashboard`

> ⚠️ **ЦЯ ЗАДАЧА — ГОЛОВНА СТОРІНКА ПІСЛЯ ЛОГІНА.**
> Перша "справжня" сторінка з даними. Встановлює layout для всіх dashboard-сторінок.
>
> ⚠️ **РЕФАКТОР:** `/test` переїжджає з `(dashboard)` у новий `(focus)` route group,
> щоб тест не показував sidebar. Тест — фокусований досвід, без навігації.
> У майбутньому сюди ж переїде `/exercise/[id]`.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - React Flow (23)
> - Редагування плану (24)
> - Упражнения (25+)
> - Прогрес (43)
> - Календар (40–42)

---

## 🎯 Мета

Після завершення:
- `/dashboard` — головна з 3 станами (немає рівня / немає плану / є все)
- Layout `(dashboard)` з header + sidebar
- Layout `(focus)` — центрований, без nav (для `/test`)
- `/test` переміщено в `(focus)`
- Header: логотип + ThemeToggle + UserMenu (email + signOut)
- Sidebar: Dashboard, Plan, Exercise, Progress, Calendar

---

## ✅ Acceptance Criteria

**Layouts:**
- [x] `app/(dashboard)/layout.tsx` — header + sidebar + main
- [x] `app/(focus)/layout.tsx` — центрований контейнер без nav
- [x] `app/(focus)/test/page.tsx` — переміщено з `(dashboard)/test/`
- [x] `/dashboard` не показує 404
- [x] `/test` не показує sidebar (візуально перевірено)

**Компоненти (у `components/dashboard/`):**
- [x] `header.tsx` — логотип + `<ThemeToggle />` + `<UserMenu />`
- [x] `sidebar.tsx` — 5 посилань, підсвічений активний
- [x] `user-menu.tsx` — email + кнопка «Вийти» (`signOut` з `next-auth/react`)
- [x] `level-badge.tsx` — `CEFR_LEVEL_LABELS[level]` + code
- [x] `no-level-cta.tsx` — заголовок + кнопка «Пройти тест» → `/test`
- [x] `no-plan-cta.tsx` — кнопка «Створити план» → POST `/api/plan/generate` + `router.refresh()`
- [x] `plan-preview.tsx` — перші 3–5 тем з `plan.content`
- [x] `weak-topics-card.tsx` — список слабких тем

**Dashboard page:**
- [x] Server Component, `requireUser()`
- [x] Читає `activePlan` через `prisma.plan.findFirst({ where: { userId, isActive: true }, orderBy: { createdAt: "desc" } })`
- [x] Читає `weakTopics` через `prisma.topicProgress.findMany({ where: { userId, level: user.level, status: "not_started" } })`
- [x] Рендерить один з 3 станів

**Інше:**
- [x] Адаптивно, light + dark
- [x] `pnpm typecheck`, `pnpm --filter web test`, `pnpm build` проходять

---

## 🚫 Що НЕ входить

- ❌ React Flow (23), редагування (24), вправи (25+), прогрес (43), календар (40–42)
- ❌ Кнопка «Перегенерувати план»
- ❌ Real-time updates
- ❌ Мобільне бургер-меню (sidebar або зверху, або прихований)

---

## 📁 Файли

### Створити

- `apps/web/app/(dashboard)/layout.tsx`
- `apps/web/app/(dashboard)/dashboard/page.tsx`
- `apps/web/app/(focus)/layout.tsx`
- `apps/web/app/(focus)/test/page.tsx` (переміщено, старий видалити)
- `apps/web/components/dashboard/header.tsx`
- `apps/web/components/dashboard/sidebar.tsx`
- `apps/web/components/dashboard/user-menu.tsx`
- `apps/web/components/dashboard/level-badge.tsx`
- `apps/web/components/dashboard/no-level-cta.tsx`
- `apps/web/components/dashboard/no-plan-cta.tsx`
- `apps/web/components/dashboard/plan-preview.tsx`
- `apps/web/components/dashboard/weak-topics-card.tsx`

### Видалити

- `apps/web/app/(dashboard)/test/page.tsx` (переміщено в `(focus)`)

### Не чіпати

- `apps/web/lib/**` (тільки імпорт)
- `apps/web/app/api/**`
- `apps/web/prisma/**`
- `packages/shared/**`
- `apps/cms/**`

---

## 🧠 Три стани dashboard

`app/(dashboard)/dashboard/page.tsx`:

1. **`user.level === null`** → `<NoLevelCTA />`
   - «Вітаємо! Пройдіть тест рівня, щоб отримати персональний план»
   - Кнопка «Пройти тест» → `/test`

2. **`activePlan === null`** (але level є) → `<LevelBadge>` + `<NoPlanCTA />`
   - «Рівень: B1. Створіть план навчання»
   - Кнопка «Створити план» (client, POST `/api/plan/generate`, `router.refresh()`)

3. **Все є** → `<LevelBadge>` + `<PlanPreview plan={activePlan} />` + `<WeakTopicsCard />` + 2 CTA
   - «Переглянути весь план» → `/plan` (404 до 23)
   - «Почати вправу» → `/exercise` (404 до 25)

---

## ⚠️ Ключові нюанси (де агент може помилитись)

- **`Sidebar` — client component.** Використовує `usePathname()` для підсвічування активного пункту. Layout — Server Component, не може передати `activePath` без зайвих хаків.

- **`PlanContent` імпортується з `@/lib/plan/generate`** (тип створено в задачі 21). **НЕ дублювати** у shared, не створювати локальний тип. Якщо треба — `import type { PlanContent } from "@/lib/plan/generate"`.

- **`router.refresh()` після генерації плану** — обов'язково. Без нього dashboard залишиться в стані «немає плану» (Server Component не перечитає `activePlan`).

- **`orderBy: { createdAt: "desc" }`** у `plan.findFirst` — захист від race condition (хоча `savePlan` гарантує один активний, але зайва страховка).

- **`weakTopics` — тільки поточний рівень** (`level: user.level`). Слабкі теми A2 не цікаві B1-учню.

- **Список файлів `Sidebar`:** Dashboard (`/dashboard`), Plan (`/plan`), Exercise (`/exercise`), Progress (`/progress`), Calendar (`/calendar`). **Більшість веде на 404** — це очікувано до задач 23, 25, 43, 40. Не приховувати, не робити `disabled`. 404 = «ще не готово».

- **`signOut({ callbackUrl: "/login" })`** — з `next-auth/react`. Працює без `SessionProvider` (він не потребує context для виклику).

- **`pnpm build` після refactor** — обов'язково. Route groups `(dashboard)` + `(focus)` можуть дати конфлікт (наприклад, якщо `/test` випадково залишиться в обох). Перевірити, що `/test` рендериться **без** sidebar.

- **`middleware.ts` не чіпаємо** — matcher `/test/:path*` уже є (з задачі 17), працює незалежно від route group.

- **Адаптивність:** на мобільному sidebar — або горизонтальний nav-bar зверху, або прихований. Для MVP — мінімум, щоб не ламалось (наприклад, `hidden md:flex`).

- **`ThemeToggle`** — перевикористовувати з `@/components/theme-toggle` (створений у 16.5). Не створювати новий.

- **Dropdown для UserMenu** — використати `pnpm dlx shadcn@2.10.0 add dropdown-menu`.

- **Помилка при генерації плану** — показати `<p className="text-destructive">` «Не вдалось створити план. Спробуйте ще раз.» Кнопка повертається в нормальний стан.

---

## 📎 Контекст

- `docs/tasks/16.5-ui-foundation.md` (shadcn, ThemeToggle)
- `docs/tasks/17-user-helpers.md` (`requireUser`, middleware)
- `docs/tasks/21-plan-generation.md` (`PlanContent`, `/api/plan/generate`)
- `AGENT_RULES.md` → 7.1 (чисті компоненти), 7.2 (єнуми)

---

## 💬 Commit message

```
feat(dashboard): add dashboard with layout, sidebar and 3 states

- add (dashboard)/layout.tsx with header and sidebar
- add (focus)/layout.tsx for focused pages
- move /test from (dashboard) to (focus) — no sidebar on test
- add dashboard page with 3 states:
  - no level: CTA to take test
  - no plan: CTA to generate plan (POST /api/plan/generate)
  - full: level badge, plan preview, weak topics, CTAs
- add Header, Sidebar (client with usePathname), UserMenu (signOut),
  LevelBadge, NoLevelCTA, NoPlanCTA, PlanPreview, WeakTopicsCard
- sidebar links to 404 pages (plan, exercise, progress, calendar)
  will be filled in tasks 23, 25, 43, 40
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/22-dashboard
# ...
git add .
git commit -m "feat(dashboard): add dashboard with layout, sidebar and 3 states"
git push origin feat/22-dashboard
```

---

## 📝 Нотатки

Заповнено після завершення (2026-10-17).

### Реалізація

- **Layout-и.** `(dashboard)/layout.tsx` читає `user` через `requireUser()`
  (потрібен email для `Header`) і обгортає вміст у `AppShell showThemeToggle={false}`
  → header + `flex`(sidebar + main). `(focus)/layout.tsx` окремо відтворює фон
  (`bg-gradient-to-br …` + `DoodlePattern id="doodles-focus"`) і `ThemeToggle`
  у правому верхньому куті — без nav (як дозволяє дизайн-система, п. 5.1:
  «або обгорнути в AppShell, або відтворити той самий фон + ThemeToggle»).
- **`Sidebar`** — client (`usePathname`), 5 пунктів, активний через
  `pathname === href || pathname.startsWith(href + "/")` → класи
  `bg-primary/10 text-primary` + `aria-current="page"`. На мобільному
  `hidden md:block` — пункти натомість віддає `MobileNav` (див. нижче).
- **`Header`** — server, приймає `email`; ліворуч бургер `MobileNav` (лише
  `md:hidden`) + вордмарк (`font-display`) з лінком на `/dashboard`, праворуч
  `ThemeToggle` + `UserMenu`.
- **`UserMenu`** — client, shadcn `dropdown-menu`, показує email і «Вийти» через
  `signOut({ callbackUrl: "/login" })` (працює без `SessionProvider`).
- **3 стани** у `dashboard/page.tsx`: `level === null` → `NoLevelCTA`;
  немає `activePlan` → `LevelBadge` + `NoPlanCTA`; все є → `LevelBadge` +
  `PlanPreview` + `WeakTopicsCard` + 2 CTA. `NoPlanCTA` після успішного POST
  викликає `router.refresh()`; при помилці — `text-destructive` текст.
- **`PlanPreview`** приймає `content: PlanContent` (тип імпортовано з
  `@/lib/plan/generate`, не дубльовано). `activePlan.content` (Prisma `Json`)
  приводиться `as unknown as PlanContent`.
- **`WeakTopicsCard`** — серверний, список `topicName`; порожній стан
  «Слабких тем не виявлено — чудова робота!».

### Питання зі задачі

- **Чи `/test` без sidebar після refactor?** — Так. `/test` переїхав у `(focus)`,
  у відрендереному HTML немає жодного пункту sidebar (`Dashboard/Plan/…`) і
  немає `UserMenu`; фон — `doodles-focus`. `pnpm build` дає обидва маршрути
  `/dashboard` і `/test` без конфлікту route groups.
- **Чи `router.refresh()` оновлює dashboard після генерації?** — Так, у
  `NoPlanCTA` після `response.ok` викликається `router.refresh()`, тож Server
  Component перечитає `activePlan`. Наскрізно не перевірено лише тому, що
  `POST /api/plan/generate` у довгограючому dev-сервері падає через застарілий
  Prisma-клієнт (див. «Перевірка»); самі запити перевірені напряму.
- **Чи 3 стани рендеряться правильно?** — Так. Стан 1 (`level=null`) і стан 2
  (`level=B1`, без плану) перевірено в браузері через curl з auth-cookie
  (перевірено ключові маркери). Стан 3 перевірено логічно + прямими запитами
  Prisma (див. нижче).
- **Чи `pnpm build` проходить після route group changes?** — Так, успішно;
  у списку маршрутів є і `ƒ /dashboard`, і `ƒ /test`.
- **Чи підсвічується активний пункт у sidebar?** — Так. На `/dashboard` у HTML
  рівно один `aria-current="page"` — на лінку Dashboard, з класами
  `bg-primary/10 text-primary`.
- **Чи 404 при переходах у sidebar — очікувано?** — Так, ці маршрути
  (`/plan`, `/exercise`, `/progress`, `/calendar`) ще не існують; middleware
  matcher уже їх покриває (задача 17). Не приховуємо, не робимо `disabled`.

### Відхилення від scope (важливо)

- **Змінено `apps/web/components/layout/app-shell.tsx`** (не в списку «Створити»,
  але й не в «Не чіпати»). Додано необов'язковий проп `showThemeToggle`
  (default `true`) — бо на dashboard кут займає `Header` з власним
  `ThemeToggle`/`UserMenu`, і два фіксовані перемикачі накладались б один на
  одного. `AppShell` і далі віддає спільний фон + дудл (дизайн-система, п. 5.1).
  Зміна мінімальна, зворотно сумісна (інші споживачі не ламаються).
- **Додано `apps/web/components/ui/dropdown-menu.tsx` + залежність
  `@radix-ui/react-dropdown-menu`** через `pnpm dlx shadcn@2.10.0 add dropdown-menu`
  — прямо вказано в нюансах задачі. Це новий файл у `components/ui/`, що випадає
  зі списку «Створити», але required для `UserMenu`.
- **`(focus)/test/page.tsx` повертає лише `<TestRunner />`** — центрування
  (`container mx-auto flex min-h-screen items-center justify-center …`) перенесено
  в `(focus)/layout.tsx`, щоб не дублювати обгортку.

### Перевірка

- `pnpm --filter web typecheck` — без помилок.
- `pnpm --filter web test` — 19 файлів, 142 тести, усі проходять.
- `pnpm --filter web build` — успішно; маршрути `/dashboard` (ƒ) і `/test` (ƒ)
  присутні, route-group конфлікту немає.
- **Runtime (curl + auth-cookie проти dev-сервера):**
  - `/dashboard` (новий юзер, `level=null`) → 200, рендериться `NoLevelCTA`
    («Вітаємо!», «Пройти тест»), header (`Lingua AI`, «Меню користувача») і
    sidebar з 5 пунктами; Dashboard-пункт `aria-current="page"`.
  - `/dashboard` після `PATCH /api/user/me {level:"B1"}` → 200, `LevelBadge`
    `B1` + `Середній`, `NoPlanCTA` («Створіть план навчання»).
  - `/test` → 200, БЕЗ sidebar/UserMenu, `doodles-focus`.
  - Стан 3 (є `activePlan` + `weakTopics`): відрендерити в живому dev-сервері
    **не вдалось** — довгограючий процес тримає в пам'яті застарілий
    Prisma-клієнт, де `prisma.topicProgress === undefined`, тому
    `topicProgress.findMany` кидає 500 («Cannot read properties of undefined
    (reading 'findMany')»). **Це не помилка коду:** після `prisma generate`
    прямий скрипт з тим самим `@prisma/client` успішно виконав обидва запити
    (`plan.findFirst` → знайдено; `topicProgress.findMany` → повернув тему;
    `typeof prisma.topicProgress.findMany === "function"`). Тобто стан 3
    запрацює після **перезапуску `pnpm dev:web`**.
  - Побічний ефект перевірки: під час `next build` на тому ж `.next` працював
    `next dev`, тож прод-старт на іншому порту падав на vendor-chunks. Перед
    наступним `pnpm build`/деплоєм бажано зупинити dev-сервер.

> ⚠️ **Рекомендація:** перезапустити `pnpm dev:web` (щоб підхопити
> згенерований Prisma-клієнт) і вручну перевірити стан 3 (є план + слабкі
> теми) в браузері.

### Follow-up фікси після здачі

**1. Українське відмінювання.**
Після генерації плану підпис показував «3 підтем» замість правильної форми.
Додано `pluralize(count, one, few, many)` (файл `apps/web/lib/i18n/plural.ts`)
за правилом `%10 === 1 && %100 !== 11` → «тема/теми/тем»,
«підтема/підтеми/підтем». Перевірено в розмітці: `підтема` ×2, `підтеми` ×8.
Пізніше цю саму функцію застосовано в картці результату тесту (див. п. 5),
тож вона винесена в окремий модуль замість локальної копії в `PlanPreview`.
Покрита юніт-тестами `lib/i18n/plural.test.ts` (1, 2–4, 0/5–9, 11–14, 21–25).

**2. Мобільне меню (бургер → виїзний Sheet).**
Було: на мобільному `Sidebar` ховався (`hidden md:block`), `Header` не мав
бургера → перейти між розділами було неможливо.
Стало:
- `components/dashboard/nav-items.ts` — спільний `NAV_ITEMS` + `isActiveNav()`
  (інакше дублювали б у `Sidebar` і `MobileNav`).
- `components/ui/sheet.tsx` + залежність `@radix-ui/react-dialog@^1.3.1`
  (`pnpm --filter web add @radix-ui/react-dialog`) — shadcn `Sheet`. Новий файл
  у `components/ui/`, як із `dropdown-menu.tsx` у цій же задачі.
- `components/dashboard/mobile-nav.tsx` (client) — `Sheet side="left"`; тригер
  `Button variant="ghost"` `size="icon"` з `Menu`-іконкою,
  `aria-label="Відкрити меню"`, видимий лише `md:hidden`. Всередині —
  `SheetHeader` з вордмарком і `nav`, що **повторює стилі десктопного `Sidebar`**
  (активний — `bg-primary/10 text-primary` + `aria-current="page"`). Пункти
  обгорнуті в `SheetClose asChild` → клік і навігує, і закриває ящик.
  Спочатку було реалізовано як `dropdown-menu`, але замінено на `Sheet`
  за вимогою (має виїжджати, а не випадати).

Перевірено (Playwright, 390×844): бургер видимий, `[role="menu"]` немає,
`[role="dialog"]` відкривається як панель `x=0, width=240, height=844`
(виїзджає зліва на всю висоту), 5 пунктів з коректними `href`, активний —
Dashboard, клік по `Plan` веде на `/plan` і закриває ящик.

**3. Горизонтальне обрізання на вузьких екранах.**
`dashboard/page.tsx:44` — рядок CTA був `flex gap-2` без переносу; на ширині
≈320px дві кнопки давали 353px і обрізались `overflow-hidden` в `AppShell`
(горизонтально доскролити неможливо). Стало `flex flex-wrap gap-2`.
Перевірено на 320px: `scrollWidth` зростив із 353 → 320 (дорівнює `clientWidth`).

**Вертикальний скрол на мобільному працював** (контент 946px скролиться на
390×844, `canScroll=true`) — `AppShell` має `min-h-screen` (не фіксована висота),
тому `overflow-hidden` вертикальний скрол не блокує. Тобто звіт «немає скрола»
пояснюється саме горизонтальним обрізанням + відсутністю мобільної навігації.

**4. Вирівнювання `(focus)`-layout на мобільному.**
Було: `items-center` у `(focus)/layout.tsx` — картка тесту висіла посередині
екрана з величезними порожніми полями згори й знизу.
Стало: `items-start sm:items-center` + `pb-6 pt-16 sm:py-10` → на мобільному вміст
притиснутий до верху, на десктопі/планшеті — далі по центру.

Другий прохід: після притискання вмісту до верху лесенка рівнів
(`LevelLadder`) почала перетинатись із фіксованим `ThemeToggle`
(`fixed right-4 top-4`, `y≈16..52`), бо `pt-6` давав лесенці `y≈24..56`.
Тому верхній відступ на мобільному збільшено до `pt-16` (`y≈64..96`) —
перетину немає, на десктопі (`sm:py-10`, `items-center`) нічого не змінилось.
Перевірено (Playwright, 390×844, після «Почати тест»): кнопка
`{x:338,y:16,w:36,h:36}`, лесенка `{y:64,h:32}`, останній стовпчик (C2)
`{x:332.75,y:64,w:41.25}` → `overlap = false` і з лесенкою, і з останнім стовпчиком.

**5. Відмінювання «помилка» в картці результату тесту.**
Було: `test-result.tsx` жорстко рендерив `{errors} помилок` → «2 помилок».
Стало: `{errors} {pluralize(errors, "помилка", "помилки", "помилок")}`
(імпорт із `@/lib/i18n/plural`, спільно з `PlanPreview`).
Перевірено E2E (Playwright, акаунт, усі відповіді «Не знаю» → 10 промахів):
картка показує «1 помилка» ×10 (раніше було б «1 помилок»); правило для 2→«2 помилки»
покрито юніт-тестом.
