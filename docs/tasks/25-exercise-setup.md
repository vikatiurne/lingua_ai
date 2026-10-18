# 25 — Exercise Setup (Mode, Rule & Params)

**Епік:** E7 — Exercise
**Розмір:** M (1–2 год)
**Залежності:** 21, 24.5
**Статус:** ✅ Done
**Гілка:** `feat/25-exercise-setup`

> ⚠️ **ЦЯ ЗАДАЧА — ЕКРАН НАЛАШТУВАННЯ ВПРАВИ.**
> Створює сторінку, куди потрапляє користувач після натискання «Тренувати».
> Тут він читає теорію, обирає режим (друк/додаток) та кількість речень.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Генерація речень через AI (26)
> - Створення PDF (28)
> - Екран виконання (29)

---

## 🎯 Мета

Після завершення:
- Створено файл `data/rules.json` з текстами правил (поки що заглушки).
- Створено лоадер для читання правил з JSON.
- Сторінка `/exercise/new` приймає параметри з URL (`?level=B1&topic=...&subtopic=...`).
- Відображає правило (коротке + повне в акордеоні).
- Має перемикач (Tabs): **«Роздрукувати PDF»** та **«Виконати в додатку»**.
- Має налаштування кількості речень.
- Має кнопку «Почати», яка веде на відповідний роут.

---

## ✅ Acceptance Criteria

- [x] Є `data/rules.json` зі структурою `{ [level]: { [topic]: { [subtopic]: { short, full } } } }`.
- [x] Є `apps/web/lib/rules/loader.ts` з функцією `loadRule(level, topic, subtopic)`.
- [x] Є сторінка `app/(dashboard)/exercise/new/page.tsx`.
- [x] Сторінка парсить `searchParams`: `level`, `topic`, `subtopic`. Якщо чогось немає — редірект на `/library`.
- [x] Рендерить заголовок: «Тема: {topic} → {subtopic}».
- [x] Є компонент `components/exercise/rule-accordion.tsx` (приймає `short` та `full`).
- [x] Є компонент `components/exercise/exercise-setup.tsx` (Client Component).
- [x] Використовує `Tabs` з shadcn для вибору режиму: `pdf` та `app`.
- [x] Має два інпути (Number): «Скільки речень укр → англ» та «Скільки речень англ → укр» (за замовчуванням 5 і 5, мін 1, макс 20).
- [x] Якщо обрано режим `app`, показує підказку: «Якщо не знаєте переклад слова, поставте `...`».
- [x] Кнопка «Почати» веде на:
  - Для PDF: `/exercise/pdf?level=...&topic=...&subtopic=...&uaEn=5&enUa=5`
  - Для App: `/exercise/app?level=...&topic=...&subtopic=...&uaEn=5&enUa=5`
- [x] `pnpm typecheck` і `pnpm build` проходять.

---

## 📁 Файли

### Створити
- `data/rules.json`
- `apps/web/lib/rules/loader.ts`
- `apps/web/app/(dashboard)/exercise/new/page.tsx`
- `apps/web/components/exercise/rule-accordion.tsx`
- `apps/web/components/exercise/exercise-setup.tsx`

### Додатково (не було в тасці)
- `apps/web/components/ui/tabs.tsx` — shadcn Tabs (у проєкті не існував, обов'язковий за AC)
- `@radix-ui/react-tabs` — залежність shadcn Tabs

### Не чіпати
- `apps/web/lib/slots/**`
- `apps/web/prisma/**`

---

## 🔧 Контракти (обов'язково)

### `data/rules.json` (початкова структура)
```json
{
  "B1": {
    "Modal Verbs": {
      "Obligation (must, have to, should)": {
        "short": "Must — сильний обов'язок. Have to — зовнішня необхідність. Should — порада.",
        "full": "Повне правило: ...\nПриклади: ..."
      }
    }
  }
}
```

### `lib/rules/loader.ts`
```ts
export type RuleContent = {
  short: string;
  full: string;
};

export function loadRule(
  level: string,
  topic: string,
  subtopic: string
): Promise<RuleContent>;
```

---

## 🧠 Алгоритм (словами)

### 1. `lib/rules/loader.ts`
1. Використовує `fileURLToPath` для пошуку `data/rules.json` (як у `lib/slots/loader.ts`).
2. Читає JSON і шукає `json[level]?.[topic]?.[subtopic]`.
3. Якщо знайдено — повертає `{ short, full }`.
4. Якщо ні — повертає заглушку: `{ short: "Правило генерується...", full: "Повне правило буде доступне незабаром." }`.

### 2. `app/(dashboard)/exercise/new/page.tsx` (Server)
1. `const params = await searchParams;` (Next.js 15).
2. Якщо `!params.level || !params.topic || !params.subtopic` → `redirect("/library")`.
3. `const rule = await loadRule(level, topic, subtopic)`.
4. Рендер заголовка, `<RuleAccordion {...rule} />`, `<ExerciseSetup level={level} topic={topic} subtopic={subtopic} />`.

### 3. `components/exercise/rule-accordion.tsx` (Client)
1. Рендерить `short` текст.
2. `Accordion` з заголовком «Показати повне правило», всередині — `full` текст.

### 4. `components/exercise/exercise-setup.tsx` (Client)
1. Стан: `mode` ("pdf" | "app"), `uaEnCount` (5), `enUaCount` (5).
2. `Tabs` для вибору режиму.
3. `<Input type="number" />` для кількості.
4. Якщо `mode === "app"`, показати підказку про `...`.
5. Кнопка «Почати» → `router.push(\`/exercise/${mode}?level=\${level}&topic=\${encodeURIComponent(topic)}&subtopic=\${encodeURIComponent(subtopic)}&uaEn=\${uaEnCount}&enUa=\${enUaCount}\`)`.

---

## ⚠️ Нюанси

- **`searchParams`:** У Next.js 15 це проміс. Робіть `const params = await searchParams;`.
- **URL encode:** `topic` та `subtopic` можуть містити пробіли (наприклад, "Present Simple"). Використовуйте `encodeURIComponent` при формуванні URL.
- **Заглушки:** Роути `/exercise/pdf` та `/exercise/app` поки що не існують (404). Це нормально.
- **Лоадер:** Можете використати кешування (Map), щоб не читати файл при кожному запиті.

---

## 💬 Commit message

```
feat(exercise): add setup page with mode selection and local rules

- add data/rules.json stub for local theory
- add lib/rules/loader.ts to fetch rules from JSON
- add /exercise/new page with URL params
- add RuleAccordion component
- add ExerciseSetup component with Tabs (pdf/app) and count inputs
- add hint for "..." (skip word) in app mode
```

---

## 📝 Відхилення від таски (зафіксовано при виконанні)

1. **Next.js 14, а не 15.** У тасці «`const params = await searchParams` (Next.js 15)», але у проєкті `next@14.2.35` — там `searchParams` це plain object (`string | string[] | undefined`), не Promise. Залишено `await` (безпечний у обох версіях, готує до апгрейду) + типізація та обробка `string | string[]` під Next 14.
2. **Додано shadcn `Tabs`.** У `components/ui/` не існувало `tabs.tsx` (AC вимагає Tabs з shadcn). Створено `apps/web/components/ui/tabs.tsx` через shadcn CLI 2.10.0 + залежність `@radix-ui/react-tabs` у `apps/web/package.json`.
3. **Двоколонкова верстка (після завершення, за запитом).** Замість `max-w-3xl` — сітка `lg:grid-cols-3`: `RuleAccordion` ліворуч (`lg:col-span-1`, sticky), `ExerciseSetup` праворуч (`lg:col-span-2`). 