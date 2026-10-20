# 37 — Vocabulary Review & Training Hub

**Епік:** E9 — Review & Exports
**Розмір:** M (2–3 год)
**Залежності:** 31, 31.3, 33
**Статус:** ⬜ Todo
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
- [ ] Створити API `GET /api/exercise/[id]/vocabulary`, який повертає два масиви: `spelling[]` та `vocabulary[]` (витягуючи з `UserError` за полем `category` або `errorType`).
- [ ] Створити API `POST /api/exercise/[id]/vocabulary/save`, який отримує відфільтровані слова.
- [ ] **Збереження:** Оновити записи в `UserError`, встановивши прапорець `isSavedToTraining: true` (або перенести їх у нову таблицю `UserVocabulary`). Це дозволить тренажерам знати, які слова вчити.

### 2. UI (Сторінка `/exercise/[id]/vocabulary`)
- [ ] Створити Client Component `VocabularyHub`.
- [ ] Дві колонки (на десктопі) або таби (на мобільному):
  - **Spelling** (іконка `PenLine`).
  - **Vocabulary** (іконка `BookOpen`).
- [ ] У кожній колонці список слів у форматі: `Слово` (англ.) — `Переклад` (укр.). 
- [ ] Біля кожного слова є іконка кошика (`Trash2`). При кліку слово зникає з локального стану.
- [ ] Якщо колонка порожня — писати "Помилок немає. Чудова робота!".
- [ ] Внизу велика кнопка **"Save to Training"**. При натисканні:
  - Відправляє `POST` запит.
  - Показує банер/`toast`: "Слова збережено у ваш словник!".
  - Редіректить на `/exercises` або `/plan`.

### 3. Підключення на сторінці результатів
- [ ] На сторінці `/exercise/[id]/result` додати кнопку "Review Words" (якщо є хоча б одна помилка spelling або vocabulary).

---

## 🔧 Хрупкі місця (обов'язково)

### 1. Об'єднання з `vocabularyToAdd` (пропущені слова `...`)
Пам'ятаємо, що пропущені слова `...` зберігаються в полі `vocabularyToAdd` всередині JSON `Exercise.sentences`. 
Тобі треба об'єднати ці слова з тими, що в `UserError`, перед відображенням у колонці Vocabulary.

### 2. Видалення на льоту
Не треба видаляти слова з БД одразу при натисканні на кошик. Просто прибирай їх зі стейту (`useState`). Реальне збереження (і видалення непотрібних) відбувається тільки при натисканні "Save to Training".

---

## 💬 Commit message
feat(exercise): create vocabulary hub with spelling/vocabulary split

create GET /api/exercise/[id]/vocabulary to fetch UserError and vocabularyToAdd

create POST /api/exercise/[id]/vocabulary/save to mark words for training

add /exercise/[id]/vocabulary page with two columns and delete logic

add "Review Words" button to results page