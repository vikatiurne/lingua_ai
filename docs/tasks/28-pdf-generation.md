# 28 — PDF Generation

**Епік:** E7 — Exercise
**Розмір:** M (2–3 год)
**Залежності:** 27
**Статус:** ✅ Done (з відхиленням — див. Нотатки)
**Гілка:** `feat/28-pdf-generation`

> ⚠️ **ЦЯ ЗАДАЧА — СТВОРЕННЯ PDF ДЛЯ ДРУКУ.**
> Бере вправу з БД і генерує PDF-файл з реченнями та місцем для рукописного перекладу.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - UI виконання (29)
> - Оцінки (31+)

---

## 🎯 Мета

Після завершення:
- Є API `GET /api/exercise/[id]/pdf`.
- Він дістає `Exercise` з БД за `id`.
- Генерує PDF-документ (з підтримкою кирилиці).
- Повертає файл як `application/pdf` з заголовком `Content-Disposition: attachment`.

---

## ✅ Acceptance Criteria

- [x] Встановлено `pdf-lib` (`pnpm add pdf-lib`).
- [x] Є шрифти з підтримкою кирилиці (наприклад, `Roboto-Regular.ttf` та `Roboto-Bold.ttf`) у папці `apps/web/public/fonts/`.
- [x] Є модуль `apps/web/lib/pdf/generator.ts`.
- [x] Є API роут `apps/web/app/api/exercise/[id]/pdf/route.ts`.
- [x] PDF містить:
  - Заголовок (Тема / Підтема).
  - Дату генерації.
  - Секцію "Перекладіть українською" (для `en_uk`).
  - Секцію "Перекладіть англійською" (для `uk_en`).
- [x] Під кожним реченням є порожній простір (лінії або прямокутник) для рукописного тексту.
- [x] Сторінки автоматично додаються, якщо речення не вміщаються на одну.
- [x] `pnpm typecheck` і `pnpm build` проходять.

---

## 📁 Файли

### Створити
- `apps/web/lib/pdf/generator.ts`
- `apps/web/app/api/exercise/[id]/pdf/route.ts`

### Змінити
- `apps/web/package.json` — додати `pdf-lib`.

---

## 🔧 Контракти (обов'язково)

### `lib/pdf/generator.ts`
```ts
import type { Exercise } from "@lingua/shared";

export async function generateExercisePdf(
  exercise: Exercise
): Promise<Uint8Array>;
```

### Особливість: Шрифти
`pdf-lib` за замовчуванням використовує Helvetica, яка **не підтримує кирилицю**. Вам потрібно завантажити шрифт (наприклад, [Roboto](https://fonts.google.com/specimen/Roboto)) та покласти його `apps/web/public/fonts/Roboto-Regular.ttf` та `Roboto-Bold.ttf`.

У коді це буде виглядати так:
```ts
const fontBytes = await fs.readFile(path.join(process.cwd(), "public/fonts/Roboto-Regular.ttf"));
pdfDoc.registerFontkit(fontkit);
const customFont = await pdfDoc.embedFont(fontBytes);
```
*(Для цього також знадобиться `pnpm add @pdf-lib/fontkit`)*.

---

## 🧠 Алгоритм (словами)

### 1. `route.ts` (GET)
1. `getCurrentUser()` → 401 якщо немає сесії.
2. Дістати `id` з `params`.
3. `prisma.exercise.findUnique` → якщо немає або `userId` не збігається, повернути 404.
4. `const pdfBytes = await generateExercisePdf(exercise)`.
5. Повернути `Response` з `pdfBytes` та заголовками:
   - `Content-Type: application/pdf`
   - `Content-Disposition: attachment; filename="exercise-${id}.pdf"`

### 2. `generator.ts`
1. Створити `PDFDocument.create()`.
2. Завантажити шрифти (Roboto) та зареєструвати їх.
3. Створити першу сторінку (`pdfDoc.addPage()`).
4. Намалювати заголовок: `Exercise: {topicName} - {subtopicName}`.
5. Розділити `exercise.sentences` на два масиви: `uk_en` та `en_uk`.
6. Для кожного масиву:
   - Намалювати підзаголовок (наприклад, "Translate into English").
   - Пройтися по реченнях:
     - Перевірити, чи вистачає місця на сторінці (якщо `y < 100`, створити нову сторінку і скинути `y`).
     - Намалювати текст речення (наприклад, `1. Я живу в Києві.`).
     - Намалювати лінії або прямокутник для відповіді (відступ `y - 40`).
     - Зменшити `y` для наступного речення.
7. Зберегти документ (`pdfDoc.save()`) і повернути `Uint8Array`.

---

## ⚠️ Нюанси

- **Шрифти:** Обов'язково перевірте, що шрифт завантажується. Якщо виникне помилка `WinAnsi cannot encode`, це означає, що ви не підключили кастомний шрифт.
- **Лінії для письма:** Використовуйте `page.drawLine` або `page.drawRectangle` з прозорою заливкою для створення місця для рукописного тексту.
- **Перенос тексту:** Якщо речення дуже довге, `pdf-lib` не переносить його автоматично. Вам потрібно або використовувати бібліотеку для переносу рядків, або розбивати текст на частини вручну (перевіряючи `font.widthOfTextAtSize`).

---

## 💬 Commit message

```
feat(exercise): add PDF generation for print mode

- install pdf-lib and @pdf-lib/fontkit
- add Roboto fonts for Cyrillic support
- add generateExercisePdf in lib/pdf/generator.ts
- add GET /api/exercise/[id]/pdf endpoint
- return PDF as downloadable file
```

---

## 📝 Нотатки

Заповнено після завершення.

- **DTO-мапінг у роуті.** Контракт задачі — `generateExercisePdf(exercise: Exercise)` з `@lingua/shared`, але в БД (з задачі 27) `sentences` зберігається як Json `{source, direction: "uk_en"|"en_uk"}[]`, а поля називаються `topicName` / `subtopicName`. Роут мапить Prisma-рядок у shared-тип (`uk_en` → `uk-en`, `topicName` → `topic`); генератор залишається чистою функцією без знань про БД (патерн DTO). Підтверджено користувачем.
- **Шрифти.** У `google/fonts` Roboto зараз лише змінний шрифт (`Roboto[wdth,wght].ttf`). Взято статичні hinted TTF з `googlefonts/roboto-2` (`src/hinted/Roboto-Regular.ttf`, `Roboto-Bold.ttf`) — повна кирилиця.
- **`new Uint8Array(pdfBytes)`** у роуті — не копія заради продуктивності, а обхід TS 5.7+: `Uint8Array<ArrayBufferLike>` не входить у `BodyInit`, а свіжий `Uint8Array` має `ArrayBuffer`-бекенд.
- **Додатковий файл:** `apps/web/lib/pdf/generator.runtime.test.ts` (поза списком файлів задачі) — перевіряє валідність PDF та авто-сторінки; можна виключити з коміту.
- **Нумерація речень** спільна на весь документ (обидві секції), не посекційна.
- **Rate limit** на роут не ставив (не AI-запит, не в задачі) — якщо треба, окремим комітом.
- Runtime endpoint не перевірявся з живою сесією (потрібен залогінений користувач + вправа в БД); генератор покритий vitest (2 тести).