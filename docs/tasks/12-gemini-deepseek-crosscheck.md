# 12 — Gemini + DeepSeek Providers + Cross-Check

**Епік:** E3 — AI & Cache
**Розмір:** M (2–3 год)
**Залежності:** 10, 11
**Статус:** ✅ Done
**Гілка:** `feat/12-gemini-deepseek-crosscheck`

> ⚠️ **ЦЯ ЗАДАЧА — ЩЕ ДВА ПРОВАЙДЕРИ + ЛОГІКА CROSS-CHECK.**
> OpenRouter уже готовий (задача 11). Тепер Gemini, DeepSeek і cross-check.
>
> ⚠️ **НЕ ТОРКАЄТЬСЯ:**
>
> - Redis-кеш (задача 13)
> - Rate limiting (задача 14)
> - Конкретні промпти (задачі 26+)
> - UI

---

## 🎯 Мета

Після завершення задачі:

- Є `GeminiProvider implements AIProvider` (Google Generative Language API)
- Є `DeepSeekProvider implements AIProvider` (OpenAI-сумісний)
- Є функція `crossCheck(messages, options)` — запитує **двох різних** провайдерів, порівнює відповіді
- Є тип `CrossCheckResult` зі статусами `consistent` / `divergent` / `both_failed`
- Провайдери зареєстровані в `DEFAULT_PROVIDERS`: `[OpenRouter, Gemini, DeepSeek]`

---

## ✅ Acceptance Criteria

- [ ] Є `apps/web/lib/ai/providers/gemini.ts`
- [ ] Є `apps/web/lib/ai/providers/gemini.test.ts` — 6+ тестів
- [ ] Є `apps/web/lib/ai/providers/deepseek.ts`
- [ ] Є `apps/web/lib/ai/providers/deepseek.test.ts` — 6+ тестів
- [ ] Є `apps/web/lib/ai/cross-check.ts` + `cross-check.test.ts` — 7+ тестів
- [ ] Класи реалізують `AIProvider`
- [ ] `crossCheck` використовує **двох різних** провайдерів (не одного двічі)
- [ ] `crossCheck` повертає `CrossCheckResult` з полями `status`, `primary`, `secondary`, `normalizedTexts?`, `divergenceReason?`
- [ ] `crossCheck` **ніколи не кидає виняток** — завжди повертає результат
- [ ] `DEFAULT_PROVIDERS` містить `[OpenRouterProvider, GeminiProvider, DeepSeekProvider]`
- [ ] `.env.example` має `GEMINI_API_KEY`, `GEMINI_DEFAULT_MODEL`, `DEEPSEEK_API_KEY`, `DEEPSEEK_DEFAULT_MODEL`
- [ ] `pnpm typecheck` і `pnpm --filter web test` проходять

---

## 🚫 Що НЕ входить (out of scope)

- ❌ Streaming
- ❌ Function calling
- ❌ Автоматичний вибір провайдерів за якістю
- ❌ Третій голос при divergent
- ❌ Збереження divergent-результатів у БД (задача 35)
- ❌ Інтеграція з основним flow (задачі 26+)

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

- `apps/web/lib/ai/registry.ts` — додати Gemini і DeepSeek
- `apps/web/lib/ai/types.ts` — додати `CrossCheckStatus`, `CrossCheckResult`
- `.env.example` (корінь) — додати ключі

### Не чіпати

- `apps/web/lib/ai/providers/openrouter.ts` — задача 11
- `apps/web/lib/ai/fallback.ts`, `provider.ts`, `errors.ts`, `logger.ts`
- `packages/shared/**`

---

## 🔧 Інтерфейси (обов'язково)

### Класи

```ts
import type {
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
} from "../types";
import type { AIProvider } from "../provider";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;
  isConfigured(): boolean;
  complete(
    messages: AIMessage[],
    options?: AICompletionOptions,
  ): Promise<AICompletionResult>;
}

export class DeepSeekProvider implements AIProvider {
  readonly name = "deepseek" as const;
  isConfigured(): boolean;
  complete(
    messages: AIMessage[],
    options?: AICompletionOptions,
  ): Promise<AICompletionResult>;
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
  options?: AICompletionOptions,
): Promise<CrossCheckResult>;
```

---

## 🧠 Алгоритм (словами)

### `GeminiProvider.complete(messages, options)`

1. Перевірити `GEMINI_API_KEY`.
2. URL: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`.
3. **Формат тіла — інший, ніж OpenAI:**
   ```json
   {
     "contents": [{ "role": "user", "parts": [{ "text": "..." }] }],
     "systemInstruction": {
       "parts": [{ "text": "system prompt" }]
     },
     "generationConfig": {
       "temperature": 0.7,
       "maxOutputTokens": 1024,
       "responseMimeType": "application/json"
     }
   }
   ```
4. `system` повідомлення → у `systemInstruction` (окреме поле, не в `contents`).
5. Retry на 429/5xx (як у OpenRouter).
6. Timeout через `AbortController`.
7. Парсинг: `data.candidates[0].content.parts[0].text` → `text`.
8. `data.usageMetadata` → `usage` (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`).
9. Модель за замовчуванням: `gemini-1.5-flash`.

### `DeepSeekProvider.complete(messages, options)`

OpenAI-сумісний. Формат ідентичний OpenRouter.

1. URL: `https://api.deepseek.com/chat/completions`.
2. Тіло як у OpenRouter (`messages`, `model`, `temperature`, `max_tokens`, `response_format`).
3. Модель за замовчуванням: `deepseek-chat`.
4. Парсинг як у OpenRouter.
5. Retry, timeout, error handling — як у OpenRouter.

### `crossCheck(messages, options)`

1. Взяти список провайдерів з реєстру, відфільтрувати `isConfigured()`.
2. Якщо менше 2 → повернути `{ status: "both_failed", divergenceReason: "Not enough providers configured" }`.
3. Взяти **перші два різні** провайдери: `primary`, `secondary`.
4. Паралельно викликати обидва через `Promise.allSettled`.
5. Якщо обидва впали → `{ status: "both_failed" }`.
6. Якщо один впав → `{ status: "divergent", divergenceReason: "One provider failed", primary/secondary: той, що живий }`.
7. Обидва успішні:
   - Нормалізувати текст: `trim`, `toLowerCase`, collapse whitespace.
   - Якщо нормалізовані однакові → `consistent`.
   - Інакше спробувати JSON-порівняння (якщо обидва валідний JSON) → порівняти через `JSON.stringify(sorted)`.
   - Інакше → `divergent` з `divergenceReason: "Text differs"`.

**Правило:** `crossCheck` **ніколи не кидає виняток**.

---

## 🔬 Приклади входу/виходу

```ts
// Обидва повернули однаковий текст (після нормалізації)
await crossCheck([{ role: "user", content: "..." }]);
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

// Один упав
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

### `gemini.test.ts` (6+)

Мок `global.fetch`.

1. Успіх → правильний `text` з `candidates[0].content.parts[0].text`.
2. `system` message → у `systemInstruction`.
3. 429 → retry → 200.
4. Timeout → `AITimeoutError`.
5. `responseFormat: "json"` → `generationConfig.responseMimeType === "application/json"`.
6. Порожній `candidates` → `AIProviderError`.

### `deepseek.test.ts` (6+)

Мок `global.fetch`.

1. Успіх → правильний `text` з `choices[0].message.content`.
2. 429 → retry → 200.
3. 500 → retry → 500 → throw.
4. Timeout → `AITimeoutError`.
5. `responseFormat: "json"` → `response_format.type === "json_object"`.
6. `isConfigured()` false без ключа.

### `cross-check.test.ts` (7+)

Мок провайдерів + `registerProviders`.

1. Обидва однакові → `consistent`.
2. Різні тексти → `divergent` з `divergenceReason: "Text differs"`.
3. Один упав → `divergent` з `"One provider failed"`.
4. Обидва впали → `both_failed`.
5. Менше 2 провайдерів → `both_failed` з `"Not enough providers configured"`.
6. JSON з різним регістром ключів → `consistent` (нормалізація).
7. **Не робить реальних HTTP-запитів** — тільки мок.

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { crossCheck } from "./cross-check";
import { registerProviders } from "./fallback";

describe("crossCheck", () => {
  beforeEach(() => {
    registerProviders([]);
    vi.restoreAllMocks();
  });

  // ... тести
});
```

---

## ⚠️ Нюанси (тільки хрупке)

### Формат Gemini (відрізняється від OpenAI!)

```ts
function toGeminiContents(messages: AIMessage[]) {
  const systemMessages = messages.filter((m) => m.role === "system");
  const otherMessages = messages.filter((m) => m.role !== "system");

  const contents = otherMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const systemInstruction =
    systemMessages.length > 0
      ? { parts: systemMessages.map((m) => ({ text: m.content })) }
      : undefined;

  return { contents, systemInstruction };
}
```

**Ключове:**

- `assistant` → `model` (не `assistant`).
- `system` → окреме поле `systemInstruction`.
- `parts[0].text` (масив).

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
    return JSON.stringify(sortKeys(ja)) === JSON.stringify(sortKeys(jb));
  } catch {
    return null;
  }
}
```

Якщо `true` → `consistent`, `false` → `divergent`, `null` → fallback на текстове порівняння.

### Вибір провайдерів для cross-check

Провайдери мають бути **різними за архітектурою**:

- OpenRouter (агрегатор: Llama/Mistral)
- Gemini (Google)
- DeepSeek (DeepSeek)

Не брати одного й того ж двічі. Брати **перших двох** зі списку налаштованих.

### APP_URL не потрібен для Gemini/DeepSeek

`HTTP-Referer` — тільки для OpenRouter. Gemini і DeepSeek не вимагають.

---

## 📎 Контекст

- `00_CONTEXT.md` → розділ 6 (стек AI)
- `docs/tasks/10-ai-provider-interface.md`
- `docs/tasks/11-openrouter-provider.md`
- `AGENT_RULES.md` → розділ 7.4

---

## 💬 Commit message

```
feat(ai): add Gemini, DeepSeek providers and cross-check

- implement GeminiProvider (Google Generative Language API)
- implement DeepSeekProvider (OpenAI-compatible)
- add crossCheck with consistent/divergent/both_failed statuses
- add CrossCheckResult type
- register providers: [OpenRouter, Gemini, DeepSeek]
- add unit tests with mocked fetch
- add GEMINI_API_KEY, DEEPSEEK_API_KEY and default models to .env.example
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

- **Чи вистачає Gemini Flash на всі задачі?** Так, для MVP. Free tier: 15 RPM / 1500 RPD (перевірено за docs.ai.google.dev, ліміти на проєкт, не на ключ). Якщо буде більше — апгрейд тарифу або fallback на DeepSeek.
- **Чи потрібен третій голос при divergent?** Поки ні — зафіксовано в out of scope цієї задачі. Повернутись після задачі 35, коли буде статистика divergent-випадків.
- **Чи зберігати divergent у БД?** Ні в цій задачі — окрема задача 35.
- **Чи працює `systemInstruction` у Gemini з порожнім system message?** Якщо system-повідомлень немає, поле `systemInstruction` у тіло запиту взагалі не додається (перевірено тестом `omits systemInstruction when there is no system message`). Runtime-перевірку з реальним API не робив — ключа немає в оточенні.
- **Яка модель Gemini за замовчуванням?** `gemini-1.5-flash` (fallback у коді; має пріоритет `GEMINI_DEFAULT_MODEL`). DeepSeek — `deepseek-chat`.

Додатково:

- `crossCheck` читає поточний список провайдерів із `fallback.ts` (щоб моки `registerProviders` у тестах працювали) — додано експорт `getRegisteredProviders()`. Це конфлікт із «Не чіпати fallback.ts» із розділу 📁 Файли; зроблено мінімальне розширення без зміни поведінки `completeWithFallback`.
- Лічильник ретраїв: 3 спроби (як в OpenRouter, задача 11), перерва 1с/2с.
- Порівняння JSON у cross-check виконується над **нормалізованими** текстами (нижній регістр) — тому JSON з різним регістром ключів визнається consistent.
