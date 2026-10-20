# 38 — Exercises History (Сторінка /exercises)

**Епік:** E9 — Review & Exports
**Розмір:** M (2–3 год)
**Залежності:** 27, 29, 33, 34
**Статус:** ✅ Done
**Гілка:** `feat/34-review-exercise` (виконано в сесії разом із задачею 34)

> ⚠️ **ЦЯ ЗАДАЧА — ІСТОРІЯ ВПРАВ.**
> Сторінка-каталог усіх вправ користувача: таби завершені/незавершені,
> сітка карток, пагінація, фільтр за періодом. Виправляє 404 у пункті
> сайдбара «Exercises».
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Генерації/оцінювання вправ (27, 31)
> - Роботи над помилками (34)
> - Прогрес-дашборду (43)

---

## 🎯 Мета

Після завершення:
- Пункт сайдбара «Exercises» веде на робочу сторінку `/exercises` (більше 404).
- Користувач бачить усі свої вправи (завершені та незавершені) картками.
- Можна продовжити незавершену вправу або переглянути результат завершеної.
- Можна фільтрувати список за періодом і гортати сторінки по 16 карток.

---

## ✅ Acceptance Criteria

- [x] Сторінка `app/(dashboard)/exercises/page.tsx` (Server Component).
- [x] `prisma.exercise.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })`.
- [x] Клієнтський компонент `components/exercise/exercises-history.tsx` (таби, сітка, пагінація, фільтр).
- [x] Таби: «Незавершені (N)» / «Завершені (N)» (`evaluated` → завершені, решта → незавершені); лічильники; перемикання скидає сторінку.
- [x] Сітка карток як у бібліотеці: `grid-cols-1 md:2 lg:3 xl:4`, `grid-auto-rows-fr`, падінги `p-3 sm:p-4`.
- [x] Картка: тема (`font-display`, truncate), підтема, дата і час (`uk-UA`).
- [x] Іконка-кнопка у правому верхньому куті (тільки іконка, з тултипом і `aria-label`):
  - незавершена → `Play` «Продовжити» → `/exercise/[id]`;
  - завершена → `Info` «Дивитись результат» → `/exercise/[id]/result`.
- [x] Кнопки з акцентним кольором: `text-primary`, hover `bg-accent/60`.
- [x] Футер завершеної картки — один рядок: `Topic N% · Grammar N%`.
- [x] Пагінація: 16 карток на сторінку, «◀ Сторінка X з Y ▶», ховається при 1 сторінці; скидається при зміні таба/періоду.
- [x] Фільтр за періодом: «Весь час / Тиждень / Місяць / Рік» (7/30/365 днів від «зараз»), застосовується до обох табів.
- [x] Empty state (немає вправ взагалі): текст + кнопка «Перейти до плану» → `/plan`.
- [x] Пункт сайдбара: `nav-items.ts` href `/exercise` → `/exercises` (фіксить 404, mobile-nav підхоплює автоматично).
- [x] Кнопка дашборду «Почати вправу» → `/exercises` (було `/exercise` → 404).
- [x] На `/exercise/[id]` лінк «Back to Exercises» → `/exercises` (не зачіпає план-флоу: plan → `/exercise/new` → `/exercise/app`).
- [x] На `/exercise/[id]/result` лінк «Back to Exercises» → `/exercises`.
- [x] `pnpm typecheck` і `pnpm build` проходять.

---

## 🔧 Хрупкі місця

### 1. Поділ статусів
`evaluated` → таб «Завершені». `generated` та `in_progress` → «Незавершені»
(Continue веде на `/exercise/[id]`, яка обробляє обидва статуси).

### 2. Клієнт/сервер розділення
Сторінка (server) тільки тягне дані й серіалізує `createdAt` в ISO-рядок.
Усе інтерактивне (таби, пагінація, фільтр, тултіпи) — у
`exercises-history.tsx` (`"use client"`).

### 3. Пагінація на клієнті
Усі вправи завантажуються з БД одним запитом, слайс 16/sh на клієнті.
`safePage = min(page, totalPages)` — захист від порожньої сторінки після
зміни фільтра. Для тисяч вправ знадобиться server-side `skip/take` (окрема задача).

### 4. TooltipProvider
Обгортає весь блок (`delayDuration={150}`), як у `question-card.tsx`.

---

## 📁 Файли

**Створено:**
- `apps/web/app/(dashboard)/exercises/page.tsx`
- `apps/web/components/exercise/exercises-history.tsx`

**Змінено:**
- `apps/web/components/dashboard/nav-items.ts` (href `/exercise` → `/exercises`)
- `apps/web/app/(dashboard)/dashboard/page.tsx` (кнопка «Почати вправу»)
- `apps/web/app/(dashboard)/exercise/[id]/page.tsx` (Back to Exercises)
- `apps/web/app/(dashboard)/exercise/[id]/result/page.tsx` (Back to Exercises)

---

## 💬 Commit message

```
feat(exercises): add exercises history page

- add /exercises page with completed/in-progress tabs
- 4-column card grid with icon actions and tooltips
- client pagination (16 per page) and period filter
- fix sidebar and dashboard links from /exercise to /exercises
- back links on exercise and result pages point to the list
```

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 3 (логіка вправи)
- `02_DESIGN_SYSTEM.md` → токени `--primary`, `--accent`, shadcn/ui
- `docs/tasks/33-results-ui.md` → екран результатів
- `docs/tasks/34-review-exercise.md` → review-вправа (редіректить на `/exercise/[id]`)
