# 37 — Vocabulary Review & Training Hub

**Епік:** E9 — Review & Exports
**Розмір:** M (2–3 год)
**Залежності:** 31, 31.3, 33
**Статус:** ✅ Done
**Гілка:** `feat/37-vocabulary-hub`

> ⚠️ **ЦЯ ЗАДАЧА — ЦЕНТР КЕРУВАННЯ СЛОВНИКОМ.**
> Користувач бачить свої англійські помилки (з `UserError`), розділені на дві категорії: Правопис (Spelling) та Словник (Vocabulary). Може їх редагувати та відправляти у внутрішні тренажери.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Самого UI Flashcards (37.5)
> - UI Spelling (37.6)

---

## 🎯 Мета

Після завершення:
- На сторінці результатів (`/exercise/[id]/result`) з'являється кнопка "Review Words" (тільки якщо є помилки spelling/vocabulary).
- Створено сторінку `/exercise/[id]/vocabulary`.
- Показано дві колонки (або таби на мобільному): 
  1. **Spelling** (слова з орфографічними помилками в англійській).
  2. **Vocabulary** (неправильно вжиті слова, синоніми або пропущені `...`).
- Користувач може видаляти слова (іконка кошика).
- Кнопка **"Save to Training"** зберігає слова в базу, щоб Flashcards та Spelling-вправа могли їх підхопити.

---

## ✅ Acceptance Criteria

### 1. API та БД
- [x] Створити API `GET /api/exercise/[id]/vocabulary`, який повертає два масиви: `spelling[]` та `vocabulary[]` (витягуючи з `UserError` за полем `category` або `errorType`).
- [x] Створити API `POST /api/exercise/[id]/vocabulary/save`, який отримує відфільтровані слова.
- [x] **Збереження:** Оновити записи в `UserError`, встановивши прапорець `isSavedToTraining: true` (або перенести їх у нову таблицю `UserVocabulary`). Це дозволить тренажерам знати, які слова вчити.
  - Обрано варіант з прапорцем: міграція `20261020000000_add_user_error_saved_to_training`.
  - Слова, прибрані кошиком, **видаляються з `UserError`** при «Save to Training» (`deleteMany`), а не при натисканні кошика.

### 2. UI (Сторінка `/exercise/[id]/vocabulary`)
- [x] Створити Client Component `VocabularyHub`.
- [x] Дві колонки (на десктопі) або таби (на мобільному):
  - **Spelling** (іконка `PenLine`).
  - **Vocabulary** (іконка `BookOpen`).
- [x] У кожній колонці список слів у форматі: `Слово` (англ.) — `Переклад` (укр.). 
- [x] Біля кожного слова є іконка кошика (`Trash2`). При кліку слово зникає з локального стану.
- [x] Якщо колонка порожня — писати "Помилок немає. Чудова робота!".
- [x] Внизу велика кнопка **"Save to Training"**. При натисканні:
  - Відправляє `POST` запит.
  - Показує банер/`toast`: "Слова збережено у ваш словник!".
  - Редіректить на `/exercises` або `/plan`.

### 3. Підключення на сторінці результатів
- [x] На сторінці `/exercise/[id]/result` додати кнопку "Review Words" (якщо є хоча б одна помилка spelling або vocabulary).
  - Кнопку розташовано в `ResultCard` **поруч із «Work on Mistakes»** (один рядок; на мобільному — рівна ширина, без переносу).
  - Колір кнопки — токен `bg-accent text-accent-foreground` (кремово-пісочний, як плашки правил), щоб не зливатись із фоном у темній темі.

- [x] `pnpm typecheck` і `pnpm build` проходять.

### 4. Додатково (відхилення, погоджені з користувачем)
- [x] Промпт `lib/ai/prompts/evaluate-answers.ts`: AI тепер повертає `vocabularyToAdd` (правильне слово + укр. переклад) і для `errorType: "spelling"`. Без цього колонка Spelling була б порожня, бо `UserError.word` заповнюється тільки з `vocabularyToAdd` (див. `lib/exercise/evaluator.ts`). Діє для нових оцінок; старі spelling-помилки без слів у колонку не потрапляють.

---

## 🔧 Хрупкі місця (обов'язково)

### 1. Об'єднання з `vocabularyToAdd` (пропущені слова `...`)
Пам'ятаємо, що пропущені слова `...` зберігаються в полі `vocabularyToAdd` всередині JSON `Exercise.sentences`. 
Тобі треба об'єднати ці слова з тими, що в `UserError`, перед відображенням у колонці Vocabulary.

### 2. Видалення на льоту
Не треба видаляти слова з БД одразу при натисканні на кошик. Просто прибирай їх зі стейту (`useState`). Реальне збереження (і видалення непотрібних) відбувається тільки при натисканні "Save to Training".

---

## 📁 Файли

**Створено:**
- `apps/web/prisma/migrations/20261020000000_add_user_error_saved_to_training/migration.sql`
- `apps/web/lib/exercise/vocabulary.ts` (спільний хелпер: злиття `UserError` + `vocabularyToAdd`, дедуплікація)
- `apps/web/app/api/exercise/[id]/vocabulary/route.ts`
- `apps/web/app/api/exercise/[id]/vocabulary/save/route.ts`
- `apps/web/app/(dashboard)/exercise/[id]/vocabulary/page.tsx`
- `apps/web/components/exercise/vocabulary-hub.tsx`

**Змінено:**
- `apps/web/prisma/schema.prisma` (`UserError.isSavedToTraining`)
- `apps/web/app/(dashboard)/exercise/[id]/result/page.tsx` (кнопка через `reviewWordsHref`)
- `apps/web/components/exercise/result-card.tsx` (кнопка «Review Words» поряд із «Work on Mistakes»)
- `apps/web/components/exercise/review-button.tsx` (рівна ширина на мобільному)
- `apps/web/lib/ai/prompts/evaluate-answers.ts` (`vocabularyToAdd` і для spelling)

---

## 💬 Commit message
feat(exercise): create vocabulary hub with spelling/vocabulary split

create GET /api/exercise/[id]/vocabulary to fetch UserError and vocabularyToAdd

create POST /api/exercise/[id]/vocabulary/save to mark words for training

add /exercise/[id]/vocabulary page with two columns and delete logic

add "Review Words" button next to "Work on Mistakes" on results page

request vocabularyToAdd for spelling errors in evaluation prompt