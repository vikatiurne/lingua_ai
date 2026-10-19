# 29 — Exercise UI (App Mode)

**Епік:** E7 — Exercise
**Розмір:** M (2–3 год)
**Залежності:** 25, 27
**Статус:** ✅ Done
**Гілка:** `feat/29-exercise-ui`

> ⚠️ **ЦЯ ЗАДАЧА — UI ДЛЯ ВИКОНАННЯ ВПРАВИ В ДОДАТКУ.**
> Створює сторінку, де користувач бачить речення і вводить переклад у текстові поля.
> Оцінка відповідей (AI) буде в задачі 31.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Оцінки через AI (31)
> - Збереження відповідей у БД (30)
> - Режиму PDF (він вже готовий)

---

## 🎯 Мета

Після завершення:
- Є сторінка `/exercise/app` (Client Component).
- Сторінка приймає параметри з URL: `level`, `topic`, `subtopic`, `ukEn`, `enUk`.
- При завантаженні робить `POST /api/exercise/generate`, отримує `exerciseId` та речення.
- Рендерить речення з інпутами для введення перекладу.
- Є кнопка «Перевірити», яка збирає всі відповіді в масив і відправляє на майбутній API (31).

---

## ✅ Acceptance Criteria

- [x] Є сторінка `app/(dashboard)/exercise/app/page.tsx` (Client Component).
- [x] Парсить `searchParams` (level, topic, subtopic, ukEn, enUk).
- [x] Робить запит на генерацію в `useEffect` (з показом лоадера).
- [x] Якщо генерація впала — показує помилку.
- [x] Рендерить компонент `ExerciseForm` з отриманими реченнями.
- [x] Для кожного речення є `<Input>` (або `<Textarea>`).
- [x] Є підказка: «Якщо не знаєте слово, напишіть `...`».
- [x] Кнопка «Перевірити» активна, тільки якщо заповнені всі поля (або хоча б одне).
- [x] При натисканні збирає `SubmitPayload` і робить `console.log` (поки що).
- [x] `pnpm typecheck` і `pnpm build` проходять.

---

## 🔧 Хрупкі місця (обов'язково)

### 1. Формат відповіді від API генерації (Задача 27)
```ts
// Те, що повертає POST /api/exercise/generate
type GenerateResponse = {
  exerciseId: string;
  sentences: {
    id: string;
    source: string;
    direction: "uk_en" | "en_uk";
    reference: string; // Еталонний переклад від AI
  }[];
  isFallback: boolean;
};
```

### 2. Формат даних для форми (State)
Оскільки користувач вводить текст, нам потрібно зберігати його відповіді.
```ts
// Стан форми
type UserAnswers = Record<string, string>; 
// Приклад: { "sentence_uuid_1": "I live in Kyiv", "sentence_uuid_2": "Він читає книгу" }
```

### 3. Формат даних для майбутнього API оцінки (Задача 31)
Коли користувач натискає «Перевірити», ми маємо відправити:
```ts
type SubmitPayload = {
  exerciseId: string;
  answers: {
    sentenceId: string;
    userAnswer: string;
  }[];
};
```

### 4. Логіка обробки `...` (Пропущене слово)
Якщо користувач вводить `...`, ми не повинні блокувати кнопку. Відправляємо це як є. AI на бекенді (Задача 31) самостійно розпізнає `...` і додасть слово в Quizlet.

---

## 🧠 Алгоритм (словами)

1. **Сторінка `app/page.tsx`**:
   - Використовує `useSearchParams` для отримання `level`, `topic`, `subtopic`, `ukEn`, `enUk`.
   - Використовує `useState` для `sentences`, `isLoading`, `error`.
   - У `useEffect` робить `fetch("/api/exercise/generate", { method: "POST", body: ... })`.
   - Поки чекає — показує скелетон або спінер.
   - Коли отримав — рендерить `<ExerciseForm sentences={sentences} exerciseId={exerciseId} />`.

2. **Компонент `ExerciseForm` (Client)**:
   - Створює стан `const [answers, setAnswers] = useState<UserAnswers>({})`.
   - Рендерить список речень:
     - `source` (що перекласти).
     - `<Textarea>` (або `<Input>`), прив'язаний до `answers[sentence.id]`.
   - Кнопка «Перевірити» викликає функцію `handleSubmit`.
   - `handleSubmit` перевіряє, що всі поля заповнені. Якщо так — формує `SubmitPayload` і робить `console.log(payload)`.

---

## ⚠️ Нюанси

- **Чому Client Component?** Нам потрібні інпути, стан введення тексту і `useEffect` для генерації. Це неможливо зробити на сервері в один клік.
- **`useSearchParams` у Next.js 14:** Оскільки це клієнтський компонент, обов'язково оберніть його в `<Suspense>` на сторінці (це вимога Next.js для `useSearchParams`), інакше білд впаде.
- **Валідація:** Не використовуйте складні бібліотеки. Просто перевірте, що `Object.values(answers).every(a => a.trim().length > 0)`.
- **Дизайн:** Використовуйте `Card` для кожного речення або загальний `Card` зі списком. Інпути мають бути зручними для читання (не занадто вузькими).

---

## 💬 Commit message

```
feat(exercise): add app mode UI for typing translations

- add /exercise/app page with generate API integration
- create ExerciseForm component with controlled inputs
- handle '...' input for skipped words
- prepare SubmitPayload for future evaluation API
- wrap useSearchParams in Suspense for Next.js 14
```

---

## 📝 Відхилення від таски (зафіксовано при виконанні)

1. **`<Input>` замість `<Textarea>`.** У `components/ui/` немає shadcn Textarea; задача дозволяє «Input (або Textarea)». Поле — `Input` з `aria-label` + `placeholder`, без нового компонента в `ui/`.
2. **Відповідь API генерації розширено (за запитом власника до задачі 29).** `POST /api/exercise/generate` повертав тільки `{ exerciseId, isFallback }` — рендерити було нічого. Додано `sentences: [{ id, source, direction, reference }]` у відповідності до `GenerateResponse` цієї задачі. `id` генерує сервер (`crypto.randomUUID()`) і зберігається в БД; `reference` (еталонний переклад) повертає AI — додано до Zod-схеми та промпту в `lib/exercise/generator.ts` / `lib/ai/prompts/generate-exercise.ts`. Файли задачі 27 змінено погоджено.
3. **Rename `uaEn`/`enUa` → `ukEn`/`enUk` (за запитом власника).** Стандарт ISO — `uk`. `ExerciseSetup` (25) формує `ukEn`/`enUk`, Zod-схема генерації (27) очікує `ukEnCount`/`enUkCount`. Правки внесено і в `docs/tasks/25`, `docs/tasks/27`.
4. **Кнопка «Перевірити»** активна, коли заповнені **всі** поля («або хоча б одне» з AC — витлумачено як «є хоча б одне речення», воно гарантоване: генерація дає ≥1). `...` рахується як заповнене поле.
5. **Підказка про `...`** — у `ExerciseForm` (картка «Ваші переклади»), не на сторінці.
6. **Валідність параметрів:** відсутні `level`/`topic`/`subtopic` → повідомлення `text-destructive` (не редірект, на відміну від `/exercise/new`). Невалідні лічильники → clamp 1–20, за замовчуванням 5.
7. **Лоадер** — `Card` + `Loader2 animate-spin` (конвенція репозиторію, скелетонів у проєкті немає).
8. **Сабміт** — ніякого видимого фідбеку після «Перевірити» (тільки `console.log`), як і в AC. Оцінка — задача 31.