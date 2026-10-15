# 07 — Slot Loader

**Епік:** E2 — Data & Shared
**Розмір:** S (1–2 год)
**Залежності:** 05
**Статус:** ⬜ Todo
**Гілка:** `feat/07-slot-loader`

> ⚠️ **ЦЯ ЗАДАЧА НЕ ТОРКАЄТЬСЯ:**
> - `data/**` — читаємо, не змінюємо
> - `apps/cms/**` (Strapi)
> - `$ref` resolver (задача 08)
> - AI-провайдери (задача 10)
> - Prisma (задача 06)
>
> **Створюється тільки модуль читання JSON-файлів.**

---

## 🎯 Мета

Після завершення задачі:
- Є функції `loadSlotFile`, `loadNounsFile`, `loadTemplateFile` — читають три типи JSON-файлів.
- Файли кешуються в пам'яті після першого читання.
- Є мапінг рівнів CEFR → імена файлів.
- Типи `SlotFile`, `SlotNounsFile` додані в `@lingua/shared`.

---

## 🔪 Вертикальний слайс

```
loadTemplateFile("B1")
    ├─→ визначає ім'я файлу через LEVEL_FILES
    ├─→ читає data/templates_b1_advanced.json
    ├─→ парсить JSON
    └─→ кешує в пам'яті
```

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/lib/slots/level-files.ts` — мапінг `CEFRLevel → { slots, nouns, templates }`
- [ ] Є `apps/web/lib/slots/loader.ts` — три функції + `clearSlotCache`
- [ ] Є `apps/web/lib/slots/loader.test.ts` — 5+ тестів
- [ ] Типи `SlotFile`, `SlotNounsFile` додані в `packages/shared`
- [ ] Кеш працює: другий виклик повертає ту саму референцію (`toBe`)
- [ ] Всі 8 рівнів завантажуються без помилок
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Розкриття `$ref` (задача 08)
- ❌ Zod-валідація JSON
- ❌ Watch mode
- ❌ Кеш у Redis (задача 13)
- ❌ Fetch зі Strapi (тільки fs)

---

## 📁 Файли

### Створити

- `apps/web/lib/slots/level-files.ts`
- `apps/web/lib/slots/loader.ts`
- `apps/web/lib/slots/loader.test.ts`

### Змінити

- `packages/shared/src/types/slot.ts` — додати `SlotFile`, `SlotNounsFile`
- `packages/shared/src/index.ts` — експорт
- `apps/web/package.json` — додати `vitest` + скрипти `test`, `test:watch`

---

## 🔧 Інтерфейси (обов'язково)

### Типи в `@lingua/shared`

```ts
export type SlotFile = {
  level: string;
  version: string;
  description?: string;
  usage?: string;
  slots: Record<string, unknown>;
};

export type SlotNounsFile = {
  level: string;
  version: string;
  description?: string;
  usage?: string;
  slots: Record<string, unknown>;
};
```

### Функції в `loader.ts`

```ts
export function loadSlotFile(level: CEFRLevel): Promise<SlotFile>;
export function loadNounsFile(level: CEFRLevel): Promise<SlotNounsFile>;
export function loadTemplateFile(level: CEFRLevel): Promise<TemplateFile>;
export function clearSlotCache(): void;
```

### Мапінг у `level-files.ts`

```ts
export type LevelFileNames = {
  slots: string;
  nouns: string;
  templates: string;
};

export const LEVEL_FILES: Record<CEFRLevel, LevelFileNames>;
```

**Важливо:** для `B1` файл шаблонів називається `templates_b1_advanced.json` (історична назва).

---

## 🧠 Алгоритм (словами)

**`loadSlotFile(level)`:**
1. Якщо в кеші є — повернути.
2. Взяти ім'я файлу з `LEVEL_FILES[level].slots`.
3. Прочитати `data/<filename>` через `fs.readFile`.
4. `JSON.parse`.
5. Покласти в кеш.
6. Повернути.

**`loadNounsFile`, `loadTemplateFile`** — те саме, але зі своїми полями мапінгу.

**`clearSlotCache()`** — очистити всі три `Map`.

**Шлях до `data/`:** через `process.cwd()` + `../../data`. Якщо `process.cwd()` ненадійний — винести в env `DATA_DIR`.

---

## 🔬 Приклади входу/виходу

```
loadTemplateFile(CEFR_LEVEL.A1)
→ { level: "A1", version: "3.0", topics: [...], generation_rules: {...} }

loadSlotFile(CEFR_LEVEL.B1)
→ { level: "B1", slots: { present_simple: {...}, ... } }

loadTemplateFile(CEFR_LEVEL.B2) === loadTemplateFile(CEFR_LEVEL.B2)
→ true (та сама референція через кеш)
```

---

## 🧪 Тести (як специфікація)

У `loader.test.ts`:

1. `loadTemplateFile(A1)` → `file.level === "A1"`, `topics.length > 0`
2. `loadSlotFile(B1)` → `file.slots` визначено
3. `loadNounsFile(B1)` → `file.slots` визначено
4. `loadTemplateFile(B2)` двічі → `first === second` (кеш)
5. `loadTemplateFile` для всіх 8 рівнів → `topics.length > 0`
6. `clearSlotCache()` → наступний виклик читає файл заново

`beforeEach` викликає `clearSlotCache()`.

---

## ⚠️ Нюанси

- **`process.cwd()` у Next.js** — це `apps/web/`. Шлях `../../data` веде в корінь монорепо. Для тестів може знадобитись env `DATA_DIR`.
- **Кеш — `Map<CEFRLevel, T>`**, не звичайний об'єкт.
- **При імпорті модуля** — перевірити, що `LEVEL_FILES` має всі 8 рівнів, інакше кинути помилку одразу.

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 9, 10
- `docs/tasks/05-shared-package.md`

---

## 💬 Commit message

```
feat(slots): add loader for slots and templates JSON files

- add level-files.ts mapping CEFR levels to filenames
- add loader.ts with in-memory cache and clearSlotCache
- add SlotFile, SlotNounsFile types to shared package
- add unit tests and vitest setup
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/07-slot-loader
# ...
git add .
git commit -m "feat(slots): add loader for slots and templates JSON files"
git push origin feat/07-slot-loader
```

---

## 📝 Нотатки

- Чи `process.cwd()` працює правильно?
- Чи потрібен `DATA_DIR`?