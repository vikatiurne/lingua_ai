# 11 — OpenRouter Provider

**Епік:** E3 — AI & Cache
**Розмір:** S (1–2 год)
**Залежності:** 10
**Статус:** ⬜ Todo
**Гілка:** `feat/11-openrouter-provider`

> ⚠️ **ЦЯ ЗАДАЧА — РЕАЛІЗАЦІЯ `AIProvider` ДЛЯ OPENROUTER.**
> Інтерфейс уже зафіксований (задача 10). Тепер імплементація.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Gemini, DeepSeek (задача 12)
> - Redis-кеш (задача 13)
> - Конкретні промпти (задачі 26, 27, 31, 33)
> - UI

---

## 🎯 Мета

Після завершення задачі:
- Є клас `OpenRouterProvider implements AIProvider`
- Провайдер викликає OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`)
- Підтримує `responseFormat: "json"` через поле `response_format`
- Retry на 429/5xx (2 спроби з exponential backoff)
- Timeout через `AbortSignal`
- Провайдер зареєстрований у `DEFAULT_PROVIDERS`

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/lib/ai/providers/openrouter.ts`
- [ ] Є `apps/web/lib/ai/providers/openrouter.test.ts` — 6+ тестів (з мок-fetch)
- [ ] Клас `OpenRouterProvider` реалізує `AIProvider`
- [ ] `isConfigured()` перевіряє `OPENROUTER_API_KEY`
- [ ] Успішний виклик → `AICompletionResult` з `provider: "openrouter"`
- [ ] `responseFormat: "json"` → додає `response_format: { type: "json_object" }` до тіла
- [ ] 429 → retry, після вичерпання → `AIProviderError`
- [ ] 400/401/403 → одразу `AIProviderError` (без retry)
- [ ] Timeout → `AITimeoutError`
- [ ] `DEFAULT_PROVIDERS` у `registry.ts` містить `new OpenRouterProvider()`
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Streaming
- ❌ Function calling / tools
- ❌ Вибір конкретної моделі за замовчуванням (модель передається у `options.model`)
- ❌ Логування у БД (задача 35)
- ❌ Cache (задача 13)

---

## 📁 Файли

### Створити
- `apps/web/lib/ai/providers/openrouter.ts`
- `apps/web/lib/ai/providers/openrouter.test.ts`

### Змінити
- `apps/web/lib/ai/registry.ts` — додати `OpenRouterProvider` у `DEFAULT_PROVIDERS`
- `.env.example` — додати `OPENROUTER_API_KEY=` і `OPENROUTER_DEFAULT_MODEL=`

---

## 🔧 Інтерфейси

```ts
export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter" as const;
  isConfigured(): boolean;
  complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult>;
}
```

---

## 🧠 Алгоритм (словами)

**`isConfigured()`:**
- `return Boolean(process.env.OPENROUTER_API_KEY)`

**`complete(messages, options)`:**
1. `startTime = Date.now()`.
2. Сформувати тіло запиту:
   - `model` з `options.model` або `OPENROUTER_DEFAULT_MODEL`.
   - `messages` як є.
   - `temperature`, `max_tokens` — якщо вказані.
   - `response_format: { type: "json_object" }` — якщо `options.responseFormat === "json"`.
3. `POST https://openrouter.ai/api/v1/chat/completions` з заголовками:
   - `Authorization: Bearer ${OPENROUTER_API_KEY}`
   - `Content-Type: application/json`
   - `HTTP-Referer: <APP_URL>` (опційно, але рекомендовано OpenRouter)
   - `X-Title: Lingua AI`
4. Retry-логіка:
   - 429 або 5xx → до 2 спроб з затримкою 1s, 2s.
   - Інші 4xx → одразу `AIProviderError`.
5. Timeout — через `AbortController` + `setTimeout(options.timeoutMs ?? 30000)`.
6. Парсинг відповіді:
   - `data.choices[0].message.content` → `text`.
   - `data.model` → `model`.
   - `data.usage` → `usage`.
7. `latencyMs = Date.now() - startTime`.
8. Повернути `AICompletionResult`.

**Помилки:**
- Timeout → `AITimeoutError`.
- Мережева помилка → `AIProviderError` (statusCode undefined).
- `!response.ok` → `AIProviderError` з `statusCode` і тілом.
- Порожній `content` → `AIProviderError("Empty response")`.

---

## 🔬 Приклади входу/виходу

```ts
const provider = new OpenRouterProvider();

// Успіх
await provider.complete(
  [{ role: "user", content: "Return JSON {ok: true}" }],
  { model: "meta-llama/llama-3.1-8b-instruct", responseFormat: "json" }
);
// → {
//     text: '{"ok":true}',
//     provider: "openrouter",
//     model: "meta-llama/llama-3.1-8b-instruct",
//     usage: { promptTokens: 12, completionTokens: 5, totalTokens: 17 },
//     latencyMs: 823
//   }

// 429 → retry → 429 → throw
// → AIProviderError("Rate limited", 429) з 2 спробами в логах

// Timeout
await provider.complete(messages, { timeoutMs: 100 });
// → AITimeoutError("openrouter", 100)
```

---

## 🧪 Тести (як специфікація)

У `openrouter.test.ts` — мок `global.fetch` через `vi.fn()`.

1. **Успіх:** fetch повертає валідний OpenRouter-ответ → `AICompletionResult` з правильними полями.
2. **`isConfigured()` false:** env не виставлений → провайдер пропускається (окремо перевірити).
3. **429 → retry → 200:** fetch викликано 2 рази → результат успіху.
4. **429 → 429 → 429:** fetch викликано 3 рази → throws `AIProviderError` з `statusCode: 429`.
5. **400:** fetch одразу 400 → throws `AIProviderError` без retry (fetch викликано 1 раз).
6. **Timeout:** fetch ніколи не resolve → `AITimeoutError`.
7. **`responseFormat: "json"`:** перевірити, що `body.response_format.type === "json_object"`.
8. **Порожній content:** fetch → `{ choices: [{ message: { content: "" } }] }` → throws.

---

## ⚠️ Нюанси (тільки хрупке)

### Формат тіла запиту OpenRouter

```ts
const body = {
  model: options?.model ?? process.env.OPENROUTER_DEFAULT_MODEL,
  messages: messages.map((m) => ({ role: m.role, content: m.content })),
  ...(options?.temperature !== undefined && { temperature: options.temperature }),
  ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
  ...(options?.responseFormat === "json" && {
    response_format: { type: "json_object" },
  }),
};
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
  maxAttempts = 3
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
const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
try {
  const response = await fetch(url, { ...opts, signal: controller.signal });
} catch (err) {
  if (err instanceof Error && err.name === "AbortError") {
    throw new AITimeoutError("openrouter", timeoutMs);
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

- Яку модель брати за дефолт? (`meta-llama/llama-3.1-8b-instruct` — дешева)
- Чи потрібен `HTTP-Referer`? (OpenRouter рекомендує)
- Чи вистачає 2 retry?