# 26 — Generate Rules Data (AI Script)

**Епік:** E7 — Exercise
**Розмір:** S (1–2 год)
**Залежності:** 10, 24.5, 25
**Статус:** ✅ Done
**Гілка:** `feat/26-generate-rules`

> ⚠️ **ЦЯ ЗАДАЧА — НАПОВНЕННЯ `data/rules.json`.**
> Ми використаємо наш AI-провайдер (OpenRouter/Gemini), щоб один раз згенерувати
> короткі та повні правила для всіх ~150 підтем і зберегти їх локально.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - UI (він уже читає з `rules.json` у задачі 25).
> - Генерація вправ (27).

---

## 🎯 Мета

Після завершення:
- Скрипт `scripts/generate-rules.ts` сканує всі `templates_*.json`.
- Знаходить усі унікальні теми та підтеми (наприклад, B1 -> Modal Verbs -> Obligation).
- Для кожної підтеми генерує через AI об'єкт `{ short, full }`.
- Записує результат у `data/rules.json` (ідемпотентно, не перезаписує існуючі).
- Команда запуску: `pnpm generate:rules`.

---

## ✅ Acceptance Criteria

- [x] Є скрипт `scripts/generate-rules.ts`.
- [x] Скрипт читає `data/templates_*.json` (всі 8 рівнів).
- [x] Скрипт перевіряє, яких правил ще немає в `data/rules.json`.
- [x] Для відсутніх правил робить запит до AI (через `apps/web/lib/ai`).
- [x] AI повертає JSON з полями `short` та `full`.
- [x] Скрипт зберігає результат у `data/rules.json`.
- [x] Команда `pnpm generate:rules` додана в кореневий `package.json`.
- [x] `pnpm typecheck` проходить.
- [x] Згенеровано **178** правил (A1:39, A2:29, A2+:13, B1:30, B1+:17, B2:19, C1:19, C2:12).
- [x] До кожного правила додано та нормалізовано поле `formula` (`scripts/fix-formulas.ts`).
- [x] Англомовні `short`/`full` перекладено українською (`scripts/translate-rules.ts`).
- [x] `short`/`full` нормалізовано: розмітка Markdown, тире `→`, прибрано дублювання формул з `full`.

---

## 📁 Файли

### Створити
- `scripts/generate-rules.ts` ✅
- `scripts/lib/ai-client.ts` ✅ (завантажує env з `apps/web/.env`, реекспортує `completeWithFallback`)

### Додатково (не було в тасці)
- `scripts/lib/parse-templates.ts` — читання `data/templates_*.json` → список `{ level, topic, subtopic }`.
- `scripts/translate-rules.ts` — переклад англомовних `short`/`full` українською + відновлення `formula`.
- `scripts/fix-formulas.ts` — масова генерація/нормалізація поля `formula` за строгим стандартом (resumable).

### Змінити
- `package.json` (корінь) — додати скрипти:
  - `"generate:rules": "tsx scripts/generate-rules.ts"`
  - `"translate:rules": "tsx scripts/translate-rules.ts"`
  - `"fix:formulas": "tsx scripts/fix-formulas.ts"`

---

## 🧠 Алгоритм (словами)

1. **Збір даних:**
   - Пройтися по всіх 8 файлах `data/templates_*.json`.
   - Зібрати унікальні ключі: `level -> topic -> subtopic`.
2. **Перевірка існуючих:**
   - Прочитати поточний `data/rules.json`.
   - Відфільтрувати ті, що вже є (щоб скрипт можна було запускати повторно).
3. **Генерація:**
   - Для кожного відсутнього правила сформувати промпт:
     > "Ти — викладач англійської. Напиши правило для теми {topic} / {subtopic} (рівень {level}). Поверни JSON: { "short": "1-2 речення суті", "full": "Повне правило з прикладами (Markdown)" }."
   - Викликати AI (використовувати `completeWithFallback` з `apps/web/lib/ai`).
   - Робити паузу між запитами (наприклад, 1 секунда), щоб не впасти в Rate Limit.
4. **Збереження:**
   - Оновити об'єкт `rules.json`.
   - Записати файл (форматований JSON).

---

## ⚠️ Нюанси

- **Структура файлу:** JSON має бути строго `{ [level]: { [topic]: { [subtopic]: { short, full } } } }`.
- **Rate Limits:** У безкоштовних моделей (Gemini) ліміт на кількість запитів. Тому додайте `await new Promise(r => setTimeout(r, 1000))` між запитами.
- **Ідемпотентність:** Скрипт має пропускати ті теми, які вже є в `rules.json`. Якщо хочете перегенерувати все — треба видалити файл і запустити знову.
- **Формат Markdown:** У полі `full` попросіть AI використовувати `\n` для перенесення рядків та `-` для списків, щоб потім це гарно відрендерилося в React.
- **Використання AI:** Використовуйте вже готовий інтерфейс `completeWithFallback`, який ми зробили в задачах 10-12. Імпортуйте його з `../apps/web/lib/ai/fallback`.

---

## 💬 Commit message

```
chore(data): generate rules.json for all subtopics via AI

- add scripts/generate-rules.ts
- scan templates, find missing rules, prompt AI for short/full content
- save result to data/rules.json (idempotent)
- add pnpm generate:rules script
```

---

## 📝 Відхилення від таски (зафіксовано при виконанні)

1. **Затримка між запитами 4500 мс, а не 1000 мс.** У тасці було `1000` мс, але безкоштовний тариф Gemini дає ~15 запитів/хв. Константа `REQUEST_DELAY_MS = 4500` у всіх скриптах.
2. **Модель `gemini-3.5-flash-lite`.** `gemini-2.5-flash` застарів; робоча модель задається через `GEMINI_DEFAULT_MODEL` в `apps/web/.env`. `OPENROUTER_API_KEY` відсутній, `DEEPSEEK_API_KEY` з нульовим балансом — фактично працює лише Gemini (порядок fallback: OpenRouter → Gemini → DeepSeek).
3. **Додатковий файл `scripts/lib/parse-templates.ts`.** Логіку сканування `data/templates_*.json` винесено в окремий хелпер замість інлайну в `generate-rules.ts`.
4. **Додано поле `formula`.** Початкова структура була `{ short, full }`, але UI показує формулу окремим блоком. Додано третє поле `formula`, яке відновлюється локально (`extractFormula` у `translate-rules.ts`) або генерується AI. Порядок ключів у файлі: `formula`, `short`, `full`.
5. **Скрипт `translate-rules.ts` (не було в тасці).** Перша генерація частково повернула текст англійською. Скрипт знаходить поля `short`/`full` без кирилиці та перекладає їх українською за гібридним підходом (пояснення — українською, лінгвістичні терміни — англійською, приклади з перекладом у дужках).
6. **Скрипт `fix-formulas.ts` (не було в тасці).** Формули були неузгодженими. Скрипт масово перегенеровує `formula` за строгим стандартом (лише `S, V1, V2, V3, V-ing, O, N, Adj, Adv, Aux`; `+` та `/`; без крапки). Класифікує підтему як affirmative/negative/questions/mixed і валідує: `Negative` містить `not`, `Questions` закінчується `?`, `Affirmative` не містить `not`/`?`. Має файл прогресу `data/.fix-formulas-progress.json` (resumable, видаляється після завершення).
7. **Пост-обробка даних (не було в тасці).** Після генерації проведено аудит точності (виправлення правил/формул) та нормалізацію: заміна ASCII `->` на типографічне `→`, прибирання дубльованих формул із `full`, уніфікація термінів (`V3 (ed)` → `V3 (Past Participle)` тощо). Усі зміни — тільки в `data/rules.json`.
