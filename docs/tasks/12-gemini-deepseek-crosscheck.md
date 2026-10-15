# 12 — Gemini + DeepSeek Providers + Cross-Check

**Епік:** E3 — AI & Cache
**Розмір:** M (2–3 год)
**Залежності:** 10, 11
**Статус:** ⬜ Todo
**Гілка:** `feat/12-gemini-deepseek-crosscheck`

> ⚠️ **ЦЯ ЗАДАЧА — ЩЕ ДВА ПРОВАЙДЕРИ + ЛОГІКА CROSS-CHECK.**
> OpenRouter уже готовий (задача 11). Тепер Gemini, DeepSeek і cross-check.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
> - Redis-кеш (задача 13)
> - Конкретні промпти (задачі 26+)
> - UI

---

## 🎯 Мета

Після завершення задачі:
- Є `GeminiProvider implements AIProvider` (Google Generative Language API)
- Є `DeepSeekProvider implements AIProvider` (OpenAI-сумісний)
- Є функція `crossCheck(messages, options)` — запитує двох **різних** провайдерів, порівнює відповіді
- Є тип `CrossCheckResult` зі статусом `consistent` / `divergent` / `both_failed`
- Провайдери зареєстровані в `DEFAULT_PROVIDERS` у правильному порядку: OpenRouter → Gemini → DeepSeek

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/lib/ai/providers/gemini.ts`
- [ ] Є `apps/web/lib/ai/providers/gemini.test.ts` — 5+ тестів
- [ ] Є `apps/web/lib/ai/providers/deepseek.ts`
- [ ] Є `apps/web/lib/ai/providers/deepseek.test.ts` — 5+ тестів
- [ ] Є `apps/web/lib/ai/cross-check.ts` + `cross-check.test.ts` — 6+ тестів
- [ ] Класи реалізують `AIProvider`
- [ ] `crossCheck` використовує **двох різних** провайдерів (не одного двічі)
- [ ] `crossCheck` повертає `CrossCheckResult` з полями `status`, `primary`, `secondary`, `normalizedTexts`, `divergenceReason?`
- [ ] Реєстр містить: `[OpenRouter, Gemini, DeepSeek]`
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Streaming
- ❌ Function calling
- ❌ Автоматичний вибір провайдерів за якістю
- ❌ Збереження divergent-результатів у БД (задача 35)
- ❌ Інтеграція з основним flow (задача 27+)

---

## 📁 Файли

### Створити
- `apps/web/lib/ai/providers/gemini.ts`
- `apps/web/lib/ai/providers/gemini.test.ts`
- `apps/web/lib/ai/providers/deepseek.ts`
- `apps/web/lib/ai/providers/deepseek.test.ts`
- `apps/web/lib/ai/cross-check.ts`
- `apps/web/lib/ai/cross-check.test.ts`

### Змінити
- `apps/web/lib/ai/registry.ts` — додати Gemini + DeepSeek
- `apps/web/lib/ai/types.ts` — додати `CrossCheckResult`
- `.env.example` — додати `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`

---

## 🔧 Інтерфейси

### Класи (аналогічно OpenRouter)

```ts
export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;
  isConfigured(): boolean;
  complete(messages: AIMessage[], options?: AICompletionOptions): Promise<AICompletionResult>;
}

export class DeepSeekProvider implements AIProvider {
  readonly name = "deepseek" as const;
  isConfigured(): boolean;
  complete(messages: AIMessage[], options?: AICompletionOptions): Promise<AICompletionResult>;
}
```

### Cross-check

```ts
export type CrossCheckStatus = "consistent" | "divergent" | "both_failed";

export type CrossCheckResult = {
  status: CrossCheckStatus;
  primary?: AICompletionResult;
  secondary?: AICompletionResult;
  normalizedTexts?: [string, string];
  divergenceReason?: string;
};

export function crossCheck(
  messages: AIMessage[],
  options?: AICompletionOptions
): Promise<CrossCheckResult>;
```

---

## 🧠 Алгоритм (словами)

### `GeminiProvider.complete(messages, options)`

1. Перевірити `GEMINI_API_KEY`.
2. URL: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`.
3. Тіло (інший формат, ніж OpenAI!):
   ```json
   {
     "contents": [
       { "role": "user", "parts": [{ "text": "..." }] }
     ],
     "generationConfig": {
       "temperature": 0.7,
       "maxOutputTokens": 1024,
       "responseMimeType": "application/json"
     }
   }
   ```
4. `system` повідомлення → у `systemInstruction` (окреме поле).
5. Retry на 429/5xx, timeout, як в OpenRouter.
6. Парсинг: `data.candidates[0].content.parts[0].text` → `text`.
7. `data.usageMetadata` → `usage` (`promptTokenCount`, `candidatesTokenCount`).
8. Модель за замовчуванням: `gemini-1.5-flash`.

### `DeepSeekProvider.complete(messages, options)`

OpenAI-сумісний. Формат ідентичний OpenRouter.

1. URL: `https://api.deepseek.com/chat/completions`.
2. Тіло як у OpenRouter.
3. Модель за замовчуванням: `deepseek-chat`.
4. Парсинг як у OpenRouter.
5. Retry, timeout, error handling — як у OpenRouter.

### `crossCheck(messages, options)`

1. Взяти список провайдерів з реєстру, відфільтрувати `isConfigured()`.
2. Якщо менше 2 → повернути `{ status: "both_failed" }` з `divergenceReason: "Not enough providers configured"`.
3. Взяти **перші два різні** провайдери: `primary`, `secondary`.
4. Паралельно викликати обидва через `Promise.allSettled`.
5. Якщо обидва впали → `{ status: "both_failed", primary: undefined, secondary: undefined }`.
6. Якщо один впав → `{ status: "divergent", divergenceReason: "One provider failed" }` з тим, що живий.
7. Обидва успішні:
   - Нормалізувати текст: `trim`, `toLowerCase`, collapse whitespace.
   - Якщо нормалізовані тексти однакові → `{ status: "consistent", ... }`.
   - Якщо різні → спробувати JSON-порівняння (якщо обидва — валідний JSON) → порівняти по ключах.
   - Якщо і це різне → `{ status: "divergent", divergenceReason: "Text differs", ... }`.

**Правило:** cross-check ніколи не кидає виняток. Завжди повертає `CrossCheckResult`.

---

## 🔬 Приклади входу/виходу

```ts
// Обидва провайдери повернули однаковий текст
crossCheck([{ role: "user", content: "..." }])
// → {
//     status: "consistent",
//     primary: { text: "Hello", provider: "openrouter", ... },
//     secondary: { text: "hello ", provider: "gemini", ... },
//     normalizedTexts: ["hello", "hello"]
//   }

// Різні тексти
// → {
//     status: "divergent",
//     primary: { text: "cats", ... },
//     secondary: { text: "dogs", ... },
//     divergenceReason: "Text differs"
//   }

// Один впав
// → {
//     status: "divergent",
//     primary: { ... },
//     secondary: undefined,
//     divergenceReason: "One provider failed"
//   }

// Обидва впали
// → { status: "both_failed" }
```

---

## 🧪 Тести (як специфікація)

### Gemini (5+)
1. Успіх → правильний `text` з `candidates[0].content.parts[0].text`.
2. `system` message → у `systemInstruction`.
3. 429 → retry → 200.
4. Timeout → `AITimeoutError`.
5. `responseFormat: "json"` → `generationConfig.responseMimeType === "application/json"`.

### DeepSeek (5+)
1. Успіх → правильний `text` з `choices[0].message.content`.
2. 429 → retry → 200.
3. 500 → retry → 500 → throw.
4. Timeout → `AITimeoutError`.
5. `responseFormat: "json"` → `response_format.type === "json_object"`.

### Cross-check (6+)
1. Обидва однакові → `consistent`.
2. Різні тексти → `divergent` з `divergenceReason: "Text differs"`.
3. Один упав → `divergent` з `"One provider failed"`.
4. Обидва упали → `both_failed`.
5. Менше 2 провайдерів → `both_failed` з `"Not enough providers configured"`.
6. JSON з різним регістром ключів → `consistent` (нормалізація).
7. **Не робить реальних HTTP-запитів** — тільки мок-fetch.

---

## ⚠️ Нюанси (тільки хрупке)

### Формат Gemini (відрізняється від OpenAI!)

```ts
// AIMessage → Gemini Content
function toGeminiContents(messages: AIMessage[]) {
  const systemMessages = messages.filter((m) => m.role === "system");
  const otherMessages = messages.filter((m) => m.role !== "system");

  const contents = otherMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const systemInstruction = systemMessages.length > 0
    ? { parts: systemMessages.map((m) => ({ text: m.content })) }
    : undefined;

  return { contents, systemInstruction };
}
```

### Парсинг Gemini response

```ts
const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
if (!text) throw new AIProviderError("gemini", "Empty response");

const usage = {
  promptTokens: data.usageMetadata?.promptTokenCount,
  completionTokens: data.usageMetadata?.candidatesTokenCount,
  totalTokens: data.usageMetadata?.totalTokenCount,
};
```

### Нормалізація тексту для cross-check

```ts
function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
```

### JSON-порівняння (якщо обидва валідний JSON)

```ts
function tryCompareAsJson(a: string, b: string): boolean | null {
  try {
    const ja = JSON.parse(a);
    const jb = JSON.parse(b);
    return deepEqual(ja, jb);
  } catch {
    return null;
  }
}
```

Якщо `tryCompareAsJson` повертає `true` → `consistent`, `false` → `divergent`, `null` → fallback на текстове порівняння.

### Вибір провайдерів для cross-check

Провайдери мають бути **різними за архітектурою**:
- OpenRouter (агрегатор, часто Llama/Mistral)
- Gemini (Google)
- DeepSeek (DeepSeek)

Не брати одного й того ж двічі. Брати **перших двох** зі списку налаштованих.

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 6 (стек AI)
- `docs/tasks/10-ai-provider-interface.md`
- `docs/tasks/11-openrouter-provider.md`

---

## 💬 Commit message

```
feat(ai): add Gemini, DeepSeek providers and cross-check

- implement GeminiProvider (Google Generative Language API)
- implement DeepSeekProvider (OpenAI-compatible)
- add crossCheck with consistent/divergent/both_failed statuses
- add CrossCheckResult type
- register providers: [OpenRouter, Gemini, DeepSeek]
- add 16 unit tests with mocked fetch
```

---

## 🔀 Git workflow

```bash
git checkout -b feat/12-gemini-deepseek-crosscheck
# ...
git add .
git commit -m "feat(ai): add Gemini, DeepSeek providers and cross-check"
git push origin feat/12-gemini-deepseek-crosscheck
```

---

## 📝 Нотатки

- Чи вистачає Gemini Flash на всі задачі? (1500 запросов/день бесплатно)
- Чи потрібен третій голос при divergent? (поки ні)
- Чи зберігати divergent у БД? (задача 35)