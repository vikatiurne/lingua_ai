# 10 — AI Provider Interface

**Епік:** E3 — AI & Cache
**Розмір:** M (2–3 год)
**Залежності:** 04
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
> - Реальні HTTP-запити до AI

---

## 🎯 Мета

Після завершення задачі:
- Є інтерфейс `AIProvider` з методом `complete()`
- Є функція `completeWithFallback()` — проходить по провайдерах, поки один не спрацює
- Є тип `AICompletionOptions` (model, temperature, maxTokens, timeout)
- Є логування запитів (у консоль поки що, у БД — задача 35)
- Реєстр провайдерів порожній (`DEFAULT_PROVIDERS = []`)

Реалізації конкретних провайдерів поки що — **заглушки** (будуть у 11, 12).

---

## 🔪 Вертикальний слайс

```
completeWithFallback(prompt, options)
    ├─→ openrouter.complete()  → 429/500?
    ├─→ gemini.complete()      → OK → return
    ├─→ (не дійшли) deepseek
    └─→ якщо всі впали → throw AIServiceError
```

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/lib/ai/types.ts` — типи
- [ ] Є `apps/web/lib/ai/provider.ts` — інтерфейс `AIProvider`
- [ ] Є `apps/web/lib/ai/errors.ts` — `AIServiceError`, `AIProviderError`, `AITimeoutError`
- [ ] Є `apps/web/lib/ai/fallback.ts` — `completeWithFallback`, `registerProviders`
- [ ] Є `apps/web/lib/ai/registry.ts` — реєстр провайдерів (порожній масив)
- [ ] Є `apps/web/lib/ai/logger.ts` — простий логер (консоль)
- [ ] Є `apps/web/lib/ai/fallback.test.ts` — 7+ тестів з мок-провайдерами
- [ ] `.env.example` має заглушки `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Реалізації провайдерів (задачі 11, 12)
- ❌ Redis-кеш (задача 13)
- ❌ Rate limiting (задача 14)
- ❌ Конкретні промпти (задачі 26, 27, 31, 33)
- ❌ Cross-check (задача 12)
- ❌ Streaming
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

- `.env.example` (корінь) — додати заглушки для ключів

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
import type { AIProvider } from "./provider";

export function completeWithFallback(
  messages: AIMessage[],
  options?: AICompletionOptions
): Promise<AICompletionResult>;

export function registerProviders(providers: AIProvider[]): void;
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

// Порожній на цьому етапі. Задачі 11 і 12 додадуть реалізації.
export const DEFAULT_PROVIDERS: AIProvider[] = [];
```

---

## 🧠 Алгоритм (словами)

### `completeWithFallback(messages, options)`

1. Взяти список провайдерів з реєстру (модульна змінна, ініціалізована `DEFAULT_PROVIDERS`).
2. Відфільтрувати `isConfigured() === true`.
3. Якщо порожній — кинути `AIServiceError` з `attempts: []`.
4. Для кожного провайдера:
   - `startTime = Date.now()`.
   - Викликати `provider.complete(messages, options)`.
   - При успіху — залогіювати, повернути результат.
   - При помилці — залогіювати, додати в `attempts`, продовжити.
5. Якщо всі впали — кинути `AIServiceError` з масивом спроб.

### `registerProviders(providers)`

Замінює масив провайдерів у модулі (для тестів).

### Timeout

Якщо `options.timeoutMs` вказано — обгорнути виклик у `Promise.race` з таймером.

**Важливо:** провайдери самі реалізують timeout через `AbortController`. `fallback` **не** займається таймаутом — це відповідальність провайдера. Якщо потрібно — описати в задачах 11, 12.

### Retry

Не в `fallback`. Це відповідальність провайдера (задачі 11, 12).

---

## 🔬 Приклади входу/виходу

```ts
// Успіх з першого провайдера
completeWithFallback([{ role: "user", content: "..." }])
→ { text: "...", provider: "openrouter", model: "...", latencyMs: 1234 }

// OpenRouter падає, Gemini працює
→ { text: "...", provider: "gemini", ... }

// Усі впали
→ throws AIServiceError з attempts = [
    { provider: "openrouter", error: "..." },
    { provider: "gemini", error: "..." }
  ]

// Порожній реєстр
→ throws AIServiceError("No providers configured", [])
```

---

## 🧪 Тести (як специфікація)

У `fallback.test.ts` — 7+ тестів. **Мок-провайдери** (не робити реальних запитів):

```ts
function makeMockProvider(
  name: ProviderName,
  behavior: "success" | "fail" | "not_configured",
  delayMs = 0
): AIProvider {
  return {
    name,
    isConfigured: () => behavior !== "not_configured",
    complete: async () => {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      if (behavior === "fail") throw new AIProviderError(name, "mock fail", 500);
      return {
        text: `${name}-response`,
        provider: name,
        model: `${name}-model`,
        latencyMs: delayMs,
      };
    },
  };
}
```

Тести:

1. **Один успішний** → повертає результат цього провайдера.
2. **Перший падає, другий успіх** → повертає результат другого.
3. **Усі падають** → `AIServiceError`, `attempts.length === N`.
4. **Порожній реєстр** → `AIServiceError`.
5. **`isConfigured() === false`** → провайдер пропускається.
6. **Формат результату** → містить `text`, `provider`, `model`, `latencyMs`.
7. **Реєстр з одним not_configured** → `AIServiceError`.

`beforeEach` → `registerProviders([])`.

---

## ⚠️ Нюанси

- **`isConfigured()`** — провайдер сам перевіряє наявність env-ключа. Якщо ключа немає — `false`, fallback його пропускає.
- **`ProviderName`** — фіксований union. Додавання нового провайдера — окрема задача.
- **Логування не повинно** падати при помилці — воно не критичне.
- **`registerProviders`** — для тестів. У продакшні реєстр ініціалізується з `DEFAULT_PROVIDERS` (який задачі 11, 12 наповнять).
- **Не робити реальних запитів у тестах** — тільки мок-провайдери.
- **`console.log` у логері** — прийнятно для MVP. У задачі 35 замінимо на запис у БД.

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 6 (Технічний стек, AI)
- `docs/tasks/04-shared-package.md`
- `AGENT_RULES.md` → розділ 7.4 (робота з AI)

---

## 💬 Commit message

```
feat(ai): add provider interface and fallback logic

- add AIProvider interface with complete() method
- add completeWithFallback with provider registry
- add AIProviderError, AIServiceError, AITimeoutError
- add AI logger with structured output
- add empty DEFAULT_PROVIDERS registry (filled in tasks 11-12)
- add unit tests with mock providers
- add API key placeholders to .env.example
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

Заповнюється після завершення.

- Чи достатньо 30 секунд timeout за замовчуванням?
- Чи потрібен `registerProviders` у продакшні, чи тільки для тестів?
- Чи логувати prompt цілком (небезпечно) чи тільки довжину?