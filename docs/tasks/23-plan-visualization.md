# 23 — Plan Visualization (Interactive Snake / Boustrophedon)

**Епік:** E6 — Plan
**Розмір:** M (2–3 год)
**Залежності:** 21, 22
**Статус:** ✅ Done
**Гілка:** `feat/23-plan-visualization`

> ⚠️ **ЦЯ ЗАДАЧА — ІНТЕРАКТИВНА ВІЗУАЛІЗАЦІЯ ПЛАНУ.**
> Створює сторінку `/plan` у вигляді вертикального Timeline зі змійковою (boustrophedon) розкладкою.
> Додає можливість відмічати теми як "вивчені" (чекбокс), що впливає на їхній статус у БД.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Редагування плану (24)
> - Генерація плану (21)

---

## 🎯 Мета

Після завершення:
- Сторінка `/plan` показує план у вигляді вертикального Timeline зі змійковою (boustrophedon) розкладкою.
- Біля кожної теми є чекбокс «Подучив».
- Якщо тема `mastered` (вивчена), кружок зелений, текст приглушений.
- Якщо тема `not_started`, кружок акцентний (червоний/помаранчевий для пріоритетних).
- Перша невивчена тема візуально виділяється як "поточна" (наприклад, акцентна обводка картки).

---

## ✅ Acceptance Criteria

- [x] Є сторінка `app/(dashboard)/plan/page.tsx`.
- [x] Сторінка отримує активний план (`prisma.plan.findFirst`) та прогрес (`prisma.topicProgress.findMany`).
- [x] Є API роут `app/api/plan/topic/route.ts` (PATCH) для оновлення статусу.
- [x] API приймає `{ level, topicName, status: "mastered" | "not_started" }`, робить `upsert` в `TopicProgress`.
- [x] Є компонент `components/plan/plan-timeline.tsx`.
- [x] Кожна тема рендерить чекбокс (можна використати `Checkbox` з shadcn, або кастомний).
- [x] При кліку на чекбокс викликається `fetch("/api/plan/topic", { method: "PATCH" })` і `router.refresh()`.
- [x] Візуальна логіка:
  - `status === "mastered"` → зелений вузол, зачеркнутий/сірий текст, чекбокс активний.
  - Перша тема зі `status !== "mastered"` → виділена картка (наприклад, `border-primary`), вузол активний.
  - Інші теми → звичайний вигляд.
- [x] `pnpm typecheck` і `pnpm build` проходять.

---

## 🚫 Що НЕ входить

- ❌ React Flow.
- ❌ Автоматичне відмічення теми після виконання вправи (це буде в задачах 30+).
- ❌ Перетягування (24).

---

## 📁 Файли

### Створити
- `apps/web/app/(dashboard)/plan/page.tsx`
- `apps/web/app/api/plan/topic/route.ts`
- `apps/web/components/plan/plan-timeline.tsx`
- `apps/web/components/plan/plan-topic-card.tsx`
- `apps/web/components/ui/checkbox.tsx` (shadcn Checkbox)
- `apps/web/lib/validation/plan.ts` (Zod-схема)

### Змінити
- `apps/web/package.json`: додано `@radix-ui/react-checkbox` (стандартний компонент дизайн-системи для Checkbox; обмеження стосувалось лише графових бібліотек на кшталт React Flow).
- `docs/01_ROADMAP.md`: 23 перейменовано на «Plan visualization (interactive timeline)».

---

## 🧠 Алгоритм (словами)

### 1. `app/api/plan/topic/route.ts` (PATCH)
1. `getCurrentUser()` → 401.
2. Валідація (Zod): `{ level, topicName, status }`.
3. `prisma.topicProgress.upsert`:
   - `where: { userId_level_topicName: { userId, level, topicName } }`.
   - `update: { status }`.
   - `create: { userId, level, topicName, status }`.
4. Повернути 200.

### 2. `app/(dashboard)/plan/page.tsx`
1. `user = await requireUser()`.
2. `plan = await prisma.plan.findFirst({ where: { userId: user.id, isActive: true } })`.
3. `progress = await prisma.topicProgress.findMany({ where: { userId: user.id, level: user.level } })`.
4. Передати `plan.content` та `progress` у `<PlanTimeline />`.

### 3. `components/plan/plan-timeline.tsx` (Client)
1. Отримує `content: PlanContent` та `progress: TopicProgress[]`.
2. Створює мапу `progressMap = new Map(progress.map(p => [p.topicName, p.status]))`.
3. Визначає `currentTopicIndex` (перша тема, у якої статус !== `mastered`).
4. Рендерить змійкову (boustrophedon) розкладку: парні рядки заповнюються зліва направо, непарні — справа наліво, зі з'єднуючою лінією між рядами.

### 4. `components/plan/plan-topic-card.tsx` (Client)
1. Отримує `topic`, `status`, `isCurrent` (boolean).
2. Чекбокс: `onChange` → `fetch("/api/plan/topic", { method: "PATCH", body: JSON.stringify({ level, topicName, status: newStatus }) })` → `router.refresh()`.
3. Стилі:
   - `isCurrent` → картка з акцентною обводкою (`border-2 border-primary`).
   - `status === "mastered"` → зелений вузол, сірий текст.
   - Інакше → звичайний вигляд (акцентний, якщо `priority === "high"`).

---

## ⚠️ Нюанси

- **`router.refresh()`** після PATCH обов'язковий, щоб оновити Server Component і перерахувати `currentTopicIndex`.
- **Чекбокс** можна зробити як `<input type="checkbox">` з Tailwind, або взяти `Checkbox` з shadcn (`pnpm dlx shadcn@2.10.0 add checkbox`).
- **Візуальний стан:** використовуйте `text-green-500` або `text-emerald-500` для зеленого (це єдине місце, де можна відступити від суворих семантичних кольорів, бо це статус виконання).
- **`currentTopicIndex`**: якщо всі теми вивчені, нічого не виділяємо (показуємо "Ви пройшли весь план! Можна генерувати новий").

---

## 📎 Контекст

- `docs/tasks/21-plan-generation.md`
- `docs/tasks/22-dashboard.md`
- `docs/tasks/20.1-split-progress-tables.md` (`TopicProgress`)

---

## 💬 Commit message

```
feat(plan): add interactive vertical timeline with checkboxes

- add PATCH /api/plan/topic to toggle topic mastery
- add /plan page fetching plan and topic progress
- add PlanTimeline and PlanTopicCard components
- show snake/boustrophedon vertical layout with status-based nodes (green = mastered)
- highlight first unmastered topic as current
- use router.refresh() after toggling to update state
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/23-plan-visualization
# ...
git add .
git commit -m "feat(plan): add interactive vertical timeline with checkboxes"
git push origin feat/23-plan-visualization
```

---

## 📝 Нотатки

- Чи правильно визначається "поточна" тема? → Так: `findIndex(status !== "mastered")`; якщо всі вивчені → `-1` (картка не виділяється, показується банер «Ви пройшли весь план»).
- Чи плавно працює `router.refresh()` без перезавантаження сторінки? → Так: оптимістичний стан чекбоксу оновлюється миттєво, `router.refresh()` перераховує `currentTopicIndex` без повного reload.
- Чи зберігається прогрес після перезавантаження браузера? → Так: `TopicProgress` пишеться через `upsert`, перевірено reload.

**Реалізовано (перевірено):**
- Файли: `app/(dashboard)/plan/page.tsx`, `app/api/plan/topic/route.ts` (PATCH), `components/plan/plan-timeline.tsx` (Client), `components/plan/plan-topic-card.tsx` (Client, `variant="timeline" | "grid"`), `components/plan/plan-snake.tsx` (Client), `lib/validation/plan.ts` (Zod).
- Чекбокс — shadcn `Checkbox` (`components/ui/checkbox.tsx`, `@radix-ui/react-checkbox`), керований компонентом стан `checked`.
- `useEffect` синхронізує оптимістичний `checked` із `status` після `router.refresh()`.
- API: `getCurrentUser()` → 401, Zod → 400, `upsert` за ключем `userId_level_topicName`, обгорнуто в `withRateLimit`.
- **Адаптивна розкладка:** `< lg` — вертикальний timeline (`ol`, `lg:hidden`); `≥ lg` — «змійка» `PlanSnake` (4 колонки, `hidden lg:block`).
- **Змійка (boustrophedon):** парні рядки 1-2-3-4 зліва→направо, непарні 8-7-6-5 (реверс) — порядок у DOM `[0,1,2,3,7,6,5,4,8,…]`. Лінія — одна SVG `<path>` із заокругленими кутами (`Q`, radius 14), координати вузлів вимірюються через `ResizeObserver` (`[data-topic-node]`). Перехід між рядками прокладено через **бокові поля** (`x = 12` / `width − 12`), а не крізь картки: геометрична перевірка — **0 перетинів** тіл карток.
- Номери — кружечки-бейджі над верхнім краєм картки (`-top-6`, `ring-4 ring-background`), лінія проходить крізь їхні центри. Прогрес — друга `<path>` (`stroke: --primary`) до поточної теми; «вивчені» вузли зелені (`Check`), пріоритетні — `AlertCircle`.
- **Поточна тема** виділяється подвійно: картка — `border-2 border-primary`, а її номер-бейдж — «хало» `shadow-[0_0_0_3px_hsl(var(--background)),0_0_0_5px_hsl(var(--primary))]` (проміжок фону + кільце `--primary`).
- **Фікс скролу:** з `AppShell` прибрано `overflow-hidden` (він міг блокувати скролінг на iOS/планшеті); перевірено — на `/login`, `/dashboard`, `/plan` немає зайвого горизонтального скролу.
- E2E (Playwright, тимч. dev 3002): 25 тем/чекбоксів (Radix `role=checkbox`); toggle → зелений вузол + `line-through` + `currentIndex` 0→1; reload → прогрес зберігся; uncheck → повернення; 25/25 mastered → банер + `currentIndex = -1`; 401 без auth, 400 на invalid body, 405 на GET. Без горизонтального скролу на 390px і 1536px.
- Дизайн (вертикальний варіант): компактна картка (`p-3 sm:p-4`), заголовок + Badge «Пріоритет» в один рядок, чекбокс — у правому верхньому куті без підпису (`aria-label`); підтеми — список `ul` з крапками. Висота ~90px (mobile) / ~100px (desktop); відстань `space-y-4` (конектор `-bottom-4`).
- `pnpm typecheck` ✓, `pnpm build` ✓ (`/plan`, маршрут `/api/plan/topic` присутній).

---

## 🔄 Аддендум (фінальна реалізація)

> Ці зміни внесені після початкового «Done» і **відміняють** частину опису вище
> (snake/boustrophedon, `plan-snake.tsx`, `router.refresh()`, зелений `--success`).

- **Розкладку-змійку прибрано.** `components/plan/plan-snake.tsx` видалено.
  Замість неї — адаптивна сітка карток
  (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`) + прогрес-бар
  «Вивчено X з Y тем» над сіткою.
- **Без `router.refresh()`.** Стан чекбоксів живе в `PlanTimeline`
  (`localProgress: Record<string, ProgressStatus>`), оновлюється оптимістично,
  `fetch("/api/plan/topic", { method: "PATCH" })` виконується у фоні. При помилці —
  rollback + `toast.error` (`sonner`, `<Toaster richColors position="top-center" />`
  у `app/layout.tsx`).
- **Локування тем немає.** Відмовились від `locked`/іконки замка/кнопки
  «Я вже це знаю» — усі теми редагуються.
- **Сторінка `/plan`:** заголовок «План навчання» + `Badge` рівня + підзаголовок
  «Наступний рівень: …» (`user.level` / `user.targetLevel`).
- **Кольори завершення — терракотові, не зелені** (див. `02_DESIGN_SYSTEM.md` §3):
  заповнення прогрес-бара — `bg-primary`; пройдена картка — `bg-completed-bg` +
  `border-completed-border` + `text-completed-text` (закреслений);
  банер завершення — `--success` (терракота). Токени `--success`, `--success-foreground`,
  `--completed-bg/border/text` додані в `globals.css` (light + dark) і `tailwind.config.ts`.
- **Заголовок (Header) зроблено sticky** (`sticky top-0 z-50`). Нюанс: `backdrop-blur`
  винесено у `::before` (псевдоелемент), бо `backdrop-filter` безпосередньо на
  sticky-елементі ламає hit-testing дочірніх кнопок (ThemeToggle стає некликабельним).
