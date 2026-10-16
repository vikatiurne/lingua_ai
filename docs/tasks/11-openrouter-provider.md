# 11 — OpenRouter Provider

**Епік:** E3 — AI & Cache
**Розмір:** S (1–2 год)
**Залежності:** 10
**Статус:** ✅ Done
**Гілка:** `feat/11-openrouter-provider`

> ⚠️ **ЦЯ ЗАДАЧА — РЕАЛІЗАЦІЯ `AIProvider` ДЛЯ OPENROUTER.**
> Інтерфейс зафіксований (задача 10). Тепер імплементація.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
>
> - Gemini, DeepSeek (задача 12)
> - Redis-кеш (задача 13)
> - Конкретні промпти (задачі 26, 27, 31, 33)
> - UI

---

## 🎯 Мета

Після завершення задачі:

- Є клас `OpenRouterProvider implements AIProvider`
- Викликає OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`)
- Підтримує `responseFormat: "json"` через поле `response_format`
- Retry на 429/5xx (2 спроби з exponential backoff)
- Timeout через `AbortSignal` (30 секунд за замовчуванням)
- Провайдер зареєстрований у `DEFAULT_PROVIDERS`

---

## ✅ Acceptance Criteria

- [x] Є `apps/web/lib/ai/providers/openrouter.ts`
- [x] Є `apps/web/lib/ai/providers/openrouter.test.ts` — 8+ тестів (з мок-`fetch`)
- [x] Клас `OpenRouterProvider` реалізує `AIProvider`
- [x] `isConfigured()` перевіряє `process.env.OPENROUTER_API_KEY`
- [x] Успішний виклик → `AICompletionResult` з `provider: "openrouter"`
- [x] `responseFormat: "json"` → додає `response_format: { type: "json_object" }` до тіла
- [x] 429 → retry, після вичерпання → `AIProviderError` з `statusCode: 429`
- [x] 400/401/403 → одразу `AIProviderError` (без retry)
- [x] Timeout → `AITimeoutError`
- [x] `DEFAULT_PROVIDERS` у `registry.ts` містить `new OpenRouterProvider()`
- [x] `.env.example` має `OPENROUTER_API_KEY=` і `OPENROUTER_DEFAULT_MODEL=`
- [x] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Streaming
- ❌ Function calling / tools
- ❌ Вибір конкретної моделі за замовчуванням у коді (модель через env)
- ❌ Логування у БД (задача 35)
- ❌ Cross-check (задача 12)
- ❌ Cache (задача 13)

---

## 📁 Файли

### Створити

- `apps/web/lib/ai/providers/openrouter.ts`
- `apps/web/lib/ai/providers/openrouter.test.ts`

### Змінити

- `apps/web/lib/ai/registry.ts` — додати `OpenRouterProvider` у `DEFAULT_PROVIDERS`
- `.env.example` (корінь) — додати ключі

### Не чіпати

- `apps/web/lib/ai/fallback.ts`, `provider.ts`, `types.ts`, `errors.ts`, `logger.ts`
- `packages/shared/**`

---

## 🔧 Інтерфейси (обов'язково)

```ts
import type {
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
} from "../types";
import type { AIProvider } from "../provider";

export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter" as const;

  isConfigured(): boolean;

  complete(
    messages: AIMessage[],
    options?: AICompletionOptions,
  ): Promise<AICompletionResult>;
}
```

---

## 🧠 Алгоритм (словами)

### `isConfigured()`

```ts
return Boolean(process.env.OPENROUTER_API_KEY);
```

### `complete(messages, options)`

1. `startTime = Date.now()`.
2. Сформувати тіло запиту:
   - `model` = `options.model ?? process.env.OPENROUTER_DEFAULT_MODEL`.
   - `messages` — масив `{ role, content }`.
   - `temperature`, `max_tokens` — якщо вказані.
   - `response_format: { type: "json_object" }` — якщо `options.responseFormat === "json"`.
3. `POST https://openrouter.ai/api/v1/chat/completions` з заголовками:
   - `Authorization: Bearer ${OPENROUTER_API_KEY}`
   - `Content-Type: application/json`
   - `HTTP-Referer: <APP_URL>` (опційно, але OpenRouter рекомендує)
   - `X-Title: Lingua AI`
4. Retry:
   - 429 або 5xx → до 2 спроб з затримкою 1s, 2s.
   - Інші 4xx → одразу `AIProviderError`.
5. Timeout через `AbortController`:
   - `setTimeout(() => controller.abort(), options.timeoutMs ?? 30000)`.
6. Парсинг відповіді:
   - `data.choices[0].message.content` → `text`.
   - `data.model` → `model`.
   - `data.usage` → `usage`.
7. `latencyMs = Date.now() - startTime`.
8. Повернути `AICompletionResult`.

### Помилки

- Timeout → `AITimeoutError("openrouter", timeoutMs)`.
- Мережева помилка → `AIProviderError("openrouter", message, undefined)`.
- `!response.ok` → `AIProviderError("openrouter", message, statusCode)`.
- Порожній `content` → `AIProviderError("openrouter", "Empty response", undefined)`.

---

## 🔬 Приклади входу/виходу

```ts
const provider = new OpenRouterProvider();

// Успіх
await provider.complete([{ role: "user", content: "Return JSON {ok: true}" }], {
  model: "meta-llama/llama-3.1-8b-instruct",
  responseFormat: "json",
});
// → {
//     text: '{"ok":true}',
//     provider: "openrouter",
//     model: "meta-llama/llama-3.1-8b-instruct",
//     usage: { promptTokens: 12, completionTokens: 5, totalTokens: 17 },
//     latencyMs: 823
//   }

// 429 → retry → 429 → throw
// → AIProviderError("Rate limited", 429)

// Timeout
await provider.complete(messages, { timeoutMs: 100 });
// → AITimeoutError("openrouter", 100)

// Не налаштовано
process.env.OPENROUTER_API_KEY = undefined;
provider.isConfigured(); // → false
```

---

## 🧪 Тести (як специфікація)

У `openrouter.test.ts` — 8+ тестів. Мок `global.fetch` через `vi.fn()`.

1. **Успіх:** fetch повертає валідний OpenRouter-ответ → `AICompletionResult` з правильними полями.
2. **`isConfigured()` false:** env не виставлений → `false`.
3. **429 → retry → 200:** fetch викликано 2 рази → результат успіху.
4. **429 → 429 → 429:** fetch викликано 3 рази → throws `AIProviderError` з `statusCode: 429`.
5. **400:** fetch одразу 400 → throws `AIProviderError`, fetch викликано 1 раз.
6. **Timeout:** fetch ніколи не resolve → `AITimeoutError`.
7. **`responseFormat: "json"`:** перевірити, що `body.response_format.type === "json_object"`.
8. **Порожній content:** fetch → `{ choices: [{ message: { content: "" } }] }` → throws.

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenRouterProvider } from "./openrouter";
import { AIProviderError, AITimeoutError } from "../errors";

describe("OpenRouterProvider", () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_DEFAULT_MODEL = "test-model";
    provider = new OpenRouterProvider();
  });

  // ... тести
});
```

---

## ⚠️ Нюанси (тільки хрупке)

### Формат тіла запиту OpenRouter

```ts
const body: Record<string, unknown> = {
  model: options?.model ?? process.env.OPENROUTER_DEFAULT_MODEL,
  messages: messages.map((m) => ({ role: m.role, content: m.content })),
};

if (options?.temperature !== undefined) body.temperature = options.temperature;
if (options?.maxTokens !== undefined) body.max_tokens = options.maxTokens;
if (options?.responseFormat === "json") {
  body.response_format = { type: "json_object" };
}
```

### Заголовки

```ts
{
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
  "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3001",
  "X-Title": "Lingua AI",
}
```

### Retry-логіка

```ts
async function withRetry<T>(
  fn: () => Promise<T>,
  shouldRetry: (err: unknown) => boolean,
  maxAttempts = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!shouldRetry(err) || attempt === maxAttempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
    }
  }
  throw lastErr;
}

const shouldRetry = (err: unknown): boolean => {
  if (err instanceof AIProviderError && err.statusCode) {
    return err.statusCode === 429 || err.statusCode >= 500;
  }
  return false;
};
```

### Timeout

```ts
const controller = new AbortController();
const timeoutId = setTimeout(
  () => controller.abort(),
  options?.timeoutMs ?? 30000,
);
try {
  const response = await fetch(url, { ...opts, signal: controller.signal });
  // ...
} catch (err) {
  if (err instanceof Error && err.name === "AbortError") {
    throw new AITimeoutError("openrouter", options?.timeoutMs ?? 30000);
  }
  throw err;
} finally {
  clearTimeout(timeoutId);
}
```

### Парсинг відповіді

OpenRouter повертає OpenAI-сумісний формат:

```json
{
  "id": "gen-xxx",
  "model": "meta-llama/llama-3.1-8b-instruct",
  "choices": [
    { "index": 0, "message": { "role": "assistant", "content": "..." } }
  ],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 5,
    "total_tokens": 17
  }
}
```

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 6 (стек AI)
- `docs/tasks/10-ai-provider-interface.md`
- `AGENT_RULES.md` → розділ 7.4

---

## 💬 Commit message

```
feat(ai): add OpenRouter provider

- implement OpenRouterProvider with AIProvider interface
- support response_format json, retry on 429/5xx, timeout
- register provider in DEFAULT_PROVIDERS
- add 8 unit tests with mocked fetch
- add OPENROUTER_API_KEY and OPENROUTER_DEFAULT_MODEL to .env.example
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/11-openrouter-provider
# ...
git add .
git commit -m "feat(ai): add OpenRouter provider"
git push origin feat/11-openrouter-provider
```

---

## 📝 Нотатки

- **Яку модель обрано за дефолт?** У коді дефолтної моделі **немає** — вона береться з
  `OPENROUTER_DEFAULT_MODEL` (або `options.model`). У `.env.example` встановлено значення:
  `meta-llama/llama-3.1-8b-instruct` (безкоштовна на OpenRouter, швидка, добре працює з JSON-режимом).
- **Чи потрібен `HTTP-Referer`?** OpenRouter рекомендує, але не вимагає. Додано як
  `process.env.APP_URL ?? "http://localhost:3001"`. `X-Title: Lingua AI` — для статистики
  у кабінеті OpenRouter. Обидва — необов'язкові, але корисні.
- **Чи вистачає 2 retry?** Так. 3 спроби (початкова + 2 повтори) на `429`/`5xx` із затримкою
  1s і 2s (exponential backoff). Для `4xx` (400/401/403) повторів немає — це безглуздо.
  Якщо колись буде багато `429` — `MAX_ATTEMPTS` легко підняти.
- **Чи відповідає формат OpenRouter тому, що описано в задачі?** Так, OpenRouter повністю
  OpenAI-сумісний: `choices[0].message.content`, `model`, `usage.{prompt,completion,total}_tokens`.
  `response_format: { type: "json_object" }` приймається будь-якою моделлю з підтримкою JSON mode.
- **Відхилення від задачі (незначні):**
  - Тестів 11, а не 8 — додав перевірки заголовків, мережевої помилки та `isConfigured() === true`.
  - `options.signal` з `types.ts` не використовується: у задачі не описано скасування ззовні,
    таймаут робиться власним `AbortController` на кожну спробу.
  - `APP_URL` доданий у `.env.example` — використовується для `HTTP-Referer` (корисно для
    OpenRouter статистики, а також для майбутніх OG-image/email).
    і `OPENROUTER_DEFAULT_MODEL`. Працює через fallback `http://localhost:3001`.

