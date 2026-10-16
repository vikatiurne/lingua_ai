# 02_DESIGN_SYSTEM.md — Дизайн-система Lingua AI

> Цей файл фіксує візуальний фундамент проєкту: шрифти, палітру, токени,
> компоненти та правила для всіх UI-задач (16.5, 18+).
>
> **Правило:** нова UI-задача спершу дивиться сюди. Якщо треба відійти —
> спитати, не додумувати.

---

## 1. Стиль

**«Теракота & Овсянка»** — теплий, книжний, інтелектуальний.
Асоціація: уютна паперова книга, чашка кави, блокнот. Мета — знизити стрес
при вивченні складних тем (граматики, правил) і навантаження на очі при
довгому читанні тексту та flashcards.

**Ключові принципи:**

- Тепла кремова база замість чистого білого.
- Графітовий текст замість жорсткого чорного.
- Один сильний акцент — терракота (primary).
- М'який пісок для акцентних плашок (accent).
- Ніяких яскравих/кислотних кольорів.

---

## 2. Шрифти

| Роль | Шрифт | Змінна | Tailwind-клас | Де використовується |
| ---- | ----- | ------ | ------------- | ------------------- |
| Display | **Lora** (serif) | `--font-display` | `font-display` | Заголовки (h1/h2), назви уроків, вордмарк, великі цифри/метрики |
| Sans | **Mulish** | `--font-sans` | `font-sans` (default) | Весь UI: кнопки, меню, форми, основний текст, підписи |

**Підключення:** `apps/web/app/layout.tsx` через `next/font/google`,
`subsets: ["latin", "cyrillic"]`. **Кирилиця обов'язкова** (український UI).

**Чому не Plus Jakarta Sans:** не має базового кириличного сабсету —
українські «і», «ї», «є» фолбечились би іншим шрифтом (плямистий текст).
**Mulish має** повну кирилицю.

**Правила:**

- За замовчуванням — `font-sans` (Mulish) для всього.
- `font-display` (Lora) — **тільки** для заголовків, назв і великих цифр.
  Не використовувати Lora для кнопок, полів, дрібного тексту.
- Не додавати нові шрифти без окремої задачі.

---

## 3. Палітра

Усі кольори — **тільки через CSS-змінні** у `apps/web/app/globals.css`
(`:root` — light, `.dark` — dark).
Tailwind-класи (`bg-background`, `text-primary`, `border-border` тощо)
читають ці змінні (`apps/web/tailwind.config.ts`).
**Ніколи не хардкодити** `bg-gray-100`, `text-red-500`, hex у класах.

### Light

| Токен | HSL | ≈ HEX | Призначення |
| ----- | --- | ----- | ----------- |
| `--background` | `40 60% 98%` | `#FDFBF7` | Кремовий/овсяний фон сторінок |
| `--foreground` | `215 28% 17%` | `#1F2937` | Графітовий текст |
| `--card` | `0 0% 100%` | `#FFFFFF` | Картки (білі) |
| `--primary` | `15 55% 48%` | `#BE5937` | Теракота: кнопки, посилання, активні стани |
| `--primary-foreground` | `40 60% 98%` | `#FDFBF7` | Текст на primary |
| `--secondary` | `35 44% 89%` | `#EFE5D7` | Другорядні поверхні |
| `--muted` | `38 38% 85%` | `#E7DDCA` | Приглушені поверхні |
| `--muted-foreground` | `37 12% 38%` | `#6D6455` | Другорядний текст |
| `--accent` | `40 70% 85%` | `#F4E2BE` | Пісочні плашки (правила, підказки), hover |
| `--border` / `--input` | `37 25% 88%` | `#E8E2D9` | Тепла бежева рамка |
| `--ring` | `15 55% 48%` | `#BE5937` | Focus-ring = primary |

### Dark

| Токен | HSL | ≈ HEX | Призначення |
| ----- | --- | ----- | ----------- |
| `--background` | `30 8% 10%` | `#1C1A17` | Коричнево-вугільний фон |
| `--foreground` | `38 35% 89%` | `#EDE6D9` | Теплий кремовий текст |
| `--card` | `30 9% 14%` | `#272420` | Картки |
| `--primary` | `15 63% 60%` | `#D97959` | Світліша терракота |
| `--accent` | `40 37% 66%` | `#C8B388` | Пісочний акцент |
| `--border` / `--input` | `33 10% 21%` | `#3B3630` | Тепла темна рамка |

**`--destructive`** — стандартний червоний (семантика помилок), не чіпати.

---

## 4. Компоненти та UI

- **shadcn/ui** (стиль `new-york`, base `slate`, CSS variables).
  Конфіг: `apps/web/components.json`. Версія CLI — **`shadcn@2.10.0`**
  (4.x має інший API, апгрейд — окреме ревью).
- Компоненти `components/ui/*` — **не редагувати**. Треба кастомізація —
  обгортка в `components/<feature>/`.
- Основні компоненти: `button`, `input`, `label`, `card`.
- Динамічні класи — через `cn()` з `@/lib/utils`. Без template strings.
- **Server Components за замовчуванням**, `"use client"` — тільки для інтерактиву.
- Іконки — **тільки `lucide-react`**.
- Named exports (`export function Foo`), файли — kebab-case, компоненти — PascalCase.

### Стани

- Помилка поля: `<Label>` + `<Input aria-invalid>` + `text-sm font-medium text-destructive`.
- Root-помилка (невірний пароль, 429): банер над формою —
  `border-destructive/50 bg-destructive/10 text-destructive` + іконка `AlertCircle`.
- Успіх: зелений банер + `CheckCircle2`.
- Loading: кнопка `disabled`, текст + `Loader2` (`animate-spin`).

---

## 5. Тема (light/dark)

- **`next-themes`**: `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`,
  `enableSystem`, `disableTransitionOnChange`) у `app/layout.tsx`.
- `<html suppressHydrationWarning>` — обов'язково (theme script).
- `ThemeToggle` (`components/theme-toggle.tsx`) — mounted-safe (disabled до mounted).
- Перемикач живе у правому верхньому куті auth-сторінок; у dashboard — у header (задача 22).

---

## 6. Асети

- **Favicon:** `apps/web/app/icon.svg` — теракота `#BE5937` + кремова «L» (serif).
- **Дудл-фон:** `apps/web/components/auth/doodle-pattern.tsx` — SVG `<pattern>`
  з ручками, олівцями, «?», «!», зірочками, хвилями. Освітня тема, без
  зовнішніх зображень. Використання: низька прозорість (6–8%) як фон.
- **Логотип-марка:** прибрано за рішенням користувача. Є тільки текстовий
  вордмарк «Lingua AI» (`font-display`). `components/auth/logo.tsx` —
  неюзаний, залишено на потім (можна видалити).
- **Графіка:** CSS-градієнти + прості SVG. Без PNG/JPG, Lottie, GIF,
  зовнішніх URL зображень.

---

## 7. Бренд-панель (auth layout)

`apps/web/app/(auth)/layout.tsx`:

- Desktop (lg+): split-layout — зліва бренд-панель, справа форма.
- Бренд-панель: фон `#1C1A18`, blob-и `bg-primary/40` + `bg-accent/20`,
  дудл-узор, заголовок (`font-display`), список фіч з іконками.
- Форма: фон `bg-gradient-to-br from-background via-background to-accent/40`,
  картка `max-w-md`, `ThemeToggle` у правому верхньому куті.
- Mobile: панель прихована, вордмарк над карткою.

---

## 8. Чого не робити

- ❌ Хардкодити кольори (hex/rgb/палітра Tailwind) у компонентах — тільки токени.
- ❌ Змінювати `components/ui/*`.
- ❌ Додавати нові UI-бібліотеки (тільки shadcn/ui + lucide-react).
- ❌ Використовувати Lora поза заголовками.
- ❌ Додавати шрифти без кирилиці.
- ❌ Імпортувати логотип-марку, поки він не відновлений окремою задачею.

---

## 9. Де що лежить

- Токени теми — `apps/web/app/globals.css`
- Tailwind (кольори, шрифти, анімації) — `apps/web/tailwind.config.ts`
- Шрифти — `apps/web/app/layout.tsx`
- shadcn-конфіг — `apps/web/components.json`
- UI-компоненти — `apps/web/components/ui/`
- Feature-компоненти — `apps/web/components/<feature>/`
- Favicon — `apps/web/app/icon.svg`

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 6 (стек UI)
- `AGENT_RULES.md` → розділи 7.1, 7.2, 7.8
- `docs/tasks/16.5-ui-foundation.md` → задача, що заклала фундамент
- shadcn: https://ui.shadcn.com/docs/installation/next
