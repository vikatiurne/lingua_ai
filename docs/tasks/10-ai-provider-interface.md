# 10 — AI Provider Interface

**Епік:** E3 — AI & Cache
**Розмір:** M (2–3 год)
**Залежності:** 05
**Статус:** ⬜ Todo
**Гілка:** `feat/10-ai-provider-interface`

> ⚠️ **ЦЯ ЗАДАЧА — ТІЛЬКИ ІНТЕРФЕЙС І ЛОГІКА FALLBACK.**
> Реалізації провайдерів (OpenRouter, Gemini, DeepSeek) — задачі 11 і 12.
> Redis-кеш — задача 13.
> Конкретні промпти — задачі 26, 27, 31, 33.
>
> ⚠️ **ЦЯ ЗАДАЧА НЕ ТОРКАЄТЬСЯ:**
> - UI (Next.js)
> - Prisma (задача 06)
> - Slots (задачі 07–09)

---

## 🎯 Мета

Після завершення задачі:
- Є інтерфейс `AIProvider` з методом `complete()`.
- Є функція `completeWithFallback()` — проходить по провайдерах, поки один не спрацює.
- Є базовий клас `BaseProvider` із retry-логікою (за потреби).
- Є тип `AICompletionOptions` (model, temperature, maxTokens, timeout).
- Є логування запитів (у консоль поки що, у БД — задача 35).

Реалізації конкретних провайдерів поки що — **заглушки** (`throw new Error("Not implemented")`).

---

## 🔪 Вертикальний слайс

```
completeWithFallback(prompt, options)
    ├─→ openrouter.complete() → 429/500?
    ├─→ gemini.complete()      → OK → return
    ├─→ (не дійшли) deepseek
    └─→ якщо всі впали → throw AIServiceError
```

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/lib/ai/types.ts` — типи
- [ ] Є `apps/web/lib/ai/provider.ts` — інтерфейс `AIProvider`
- [ ] Є `apps/web/lib/ai/errors.ts` — `AIServiceError`, `AIProviderError`, `AITimeoutError`
- [ ] Є `apps/web/lib/ai/fallback.ts` — `completeWithFallback`
- [ ] Є `apps/web/lib/ai/registry.ts` — реєстр провайдерів (порожній масив на цьому етапі)
- [ ] Є `apps/web/lib/ai/logger.ts` — простий логер (консоль)
- [ ] Є `apps/web/lib/ai/fallback.test.ts` — 6+ тестів з мок-провайдерами
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Реалізації провайдерів (задачі 11, 12)
- ❌ Redis-кеш (задача 13)
- ❌ Конкретні промпти (задачі 26, 27, 31, 33)
- ❌ Cross-check (задача 12)
- ❌ Streaming (поки не потрібен)
- ❌ Function calling / tools
- ❌ Логування в БД (задача 35)

---

## 📁 Файли

### Створити

- `apps/web/lib/ai/types.ts`
- `apps/web/lib/ai/errors.ts`
- `apps/web/lib/ai/provider.ts`
- `apps/web/lib/ai/fallback.ts`
- `apps/web/lib/ai/registry.ts`
- `apps/web/lib/ai/logger.ts`
- `apps/web/lib/ai/fallback.test.ts`

### Змінити

- `.env.example` — додати заглушки для ключів (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`)

---

## 🔧 Інтерфейси (обов'язково)

### Типи в `types.ts`

```ts
export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AICompletionOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  responseFormat?: "text" | "json";
  signal?: AbortSignal;
};

export type AICompletionResult = {
  text: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  latencyMs: number;
};

export type ProviderName = "openrouter" | "gemini" | "deepseek";
```

### Інтерфейс у `provider.ts`

```ts
import type {
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
  ProviderName,
} from "./types";

export interface AIProvider {
  readonly name: ProviderName;
  isConfigured(): boolean;
  complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult>;
}
```

### Помилки в `errors.ts`

```ts
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly attempts: { provider: string; error: string }[]
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}

export class AIProviderError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export class AITimeoutError extends Error {
  constructor(public readonly provider: string, timeoutMs: number) {
    super(`Provider ${provider} timed out after ${timeoutMs}ms`);
    this.name = "AITimeoutError";
  }
}
```

### Fallback у `fallback.ts`

```ts
import type { AIMessage, AICompletionOptions, AICompletionResult } from "./types";

export function completeWithFallback(
  messages: AIMessage[],
  options?: AICompletionOptions
): Promise<AICompletionResult>;

export function registerProviders(
  providers: import("./provider").AIProvider[]
): void;
```

### Логер у `logger.ts`

```ts
export type AILogEntry = {
  provider: string;
  model?: string;
  promptLength: number;
  responseLength: number;
  latencyMs: number;
  error?: string;
};

export function logAIRequest(entry: AILogEntry): void;
```

Просто `console.log` у структурованому форматі. Пізніше — у БД.

### Реєстр у `registry.ts`

```ts
import type { AIProvider } from "./provider";

// Порожній масив на цьому етапі.
// Задачі 11 і 12 додадуть сюди реалізації.
export const DEFAULT_PROVIDERS: AIProvider[] = [];
```

---

## 🧠 Алгоритм (словами)

**`completeWithFallback`:**
1. Взяти список провайдерів з реєстру.
2. Відфільтрувати `isConfigured() === true`.
3. Якщо порожній — кинути `AIServiceError`.
4. Для кожного провайдера:
   - записати `startTime`;
   - викликати `provider.complete(messages, options)`;
   - при успіху — залогіювати, повернути;
   - при помилці — залогіювати, додати в `attempts`, продовжити.
5. Якщо всі впали — кинути `AIServiceError` з масивом спроб.

**Timeout:**
- Якщо `options.timeoutMs` вказано — обгорнути виклик у `Promise.race` з таймером.
- При спрацюванні — `AITimeoutError`.

**Retry:**
- Не в `fallback` — це відповідальність провайдера.
- Провайдери (задачі 11, 12) самі вирішують, чи робити retry на 429/500.

---

## 🔬 Приклади входу/виходу

```ts
// Успіх з першого провайдера
completeWithFallback([{ role: "user", content: "..." }])
→ { text: "...", provider: "openrouter", model: "meta-llama/...", latencyMs: 1234 }

// OpenRouter падає, Gemini працює
→ { text: "...", provider: "gemini", ... }

// Усі впали
→ throws AIServiceError з attempts = [{ provider: "openrouter", error: "..." }, ...]
```

---

## 🧪 Тести (як специфікація)

Використовувати фейкові провайдери (не робити реальних запитів).

1. **Один провайдер, успіх** → повертає результат цього провайдера.
2. **Перший падає, другий успіх** → повертає результат другого, у логах — обидві спроби.
3. **Усі падають** → `AIServiceError`, `attempts.length === N`.
4. **Порожній реєстр** → `AIServiceError`.
5. **`isConfigured() === false`** → провайдер пропускається.
6. **Timeout** → `AITimeoutError`.
7. **Формат результату** → містить `text`, `provider`, `model`, `latencyMs`.

---

## ⚠️ Нюанси

- **`isConfigured()`** — провайдер сам перевіряє наявність env-ключа. Якщо ключа немає — повертає `false`, і fallback його пропускає.
- **`ProviderName`** — фіксований union. Додавання нового провайдера — задача-фікс.
- **Timeout за замовчуванням** — 30 секунд (з `AGENT_RULES.md`).
- **Логування не повинно** падати при помилці — воно не критичне.
- **`registerProviders`** — замінює масив у реєстрі (для тестів). У продакшні реєстр ініціалізується з `DEFAULT_PROVIDERS`.
- **Не робити реальних запитів у тестах** — тільки фейкові провайдери.

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 6 (Технічний стек, AI)
- `docs/tasks/05-shared-package.md`
- `AGENT_RULES.md` → розділ 7.4 (робота з AI)

---

## 💬 Commit message

```
feat(ai): add provider interface and fallback logic

- add AIProvider interface with complete() method
- add completeWithFallback with provider registry
- add AIProviderError, AIServiceError, AITimeoutError
- add AI logger with structured output
- add unit tests with fake providers
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/10-ai-provider-interface
# ...
git add .
git commit -m "feat(ai): add provider interface and fallback logic"
git push origin feat/10-ai-provider-interface
```

---

## 📝 Нотатки

- Чи достатньо 30 секунд timeout?
- Чи потрібен `registerProviders` у продакшні, чи тільки для тестів?
- Чи варто логувати prompt цілком (небезпечно) чи тільки довжину?