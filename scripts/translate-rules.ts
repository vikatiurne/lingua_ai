import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  completeWithFallback,
  type AIMessage,
} from "./lib/ai-client.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rulesPath = resolve(repoRoot, "data", "rules.json");

const REQUEST_DELAY_MS = 4500;

type RuleContent = {
  formula?: string;
  short: string;
  full: string;
};

type TextField = "short" | "full";

type RulesFile = {
  [level: string]: {
    [topic: string]: {
      [subtopic: string]: RuleContent;
    };
  };
};

type TranslationTarget = {
  label: string;
  field: TextField;
  rule: RuleContent;
};

type FormulaTarget = {
  level: string;
  topic: string;
  subtopic: string;
  label: string;
  rule: RuleContent;
};

const CYRILLIC = /[\u0400-\u04FF]/;

function buildTranslationMessages(source: string): AIMessage[] {
  return [
    {
      role: "system",
      content:
        "Ти — досвідчений перекладач і викладач англійської мови. Відповідаєш тільки валідним JSON без пояснень, коментарів і без Markdown-обгортачок.",
    },
    {
      role: "user",
      content: [
        "Переклади наведений нижче англомовний навчальний текст українською мовою, дотримуючись ГІБРИДНОГО підходу:",
        "",
        "1. ПЕРЕКЛАДАЙ пояснення (як працює правило) українською.",
        "2. НЕ ПЕРЕКЛАДАЙ лінгвістичні та стилістичні терміни (наприклад: Anaphora, Chiasmus, Litotes, Hedging, Ellipsis, Zeugma, Anadiplosis, Polysyndeton тощо). Залишай такі терміни англійською; за бажанням додавай український відповідник у дужках, напр. «Litotes (літота)».",
        "3. Англійські приклади речень залишай англійською та додавай український переклад у дужках.",
        "4. Збережи форматування Markdown (заголовки ###, **жирний**, *курсив*, списки -, порожні рядки). У JSON-рядку використовуй \\n для перенесень рядка (валідний JSON).",
        "",
        "Приклад поганого перекладу: «Літота — це стилістичний прийом, де ви стверджуєте щось через заперечення протилежного».",
        "Приклад доброго перекладу: «**Litotes** (літота) — це стилістичний прийом, який використовує подвійне заперечення...».",
        "",
        "Текст для перекладу:",
        '"""',
        source,
        '"""',
        "",
        'Поверни JSON у форматі: { "translation": "перекладений текст" }',
      ].join("\n"),
    },
  ];
}

function buildFormulaMessages(target: FormulaTarget): AIMessage[] {
  return [
    {
      role: "system",
      content:
        "Ти — викладач англійської мови. Відповідаєш тільки валідним JSON без пояснень і без Markdown-обгортачок.",
    },
    {
      role: "user",
      content: [
        `Тема: "${target.topic}"; підтема: "${target.subtopic}" (рівень CEFR ${target.level}).`,
        "",
        "Текст правила:",
        '"""',
        `${target.rule.short}`,
        "",
        `${target.rule.full}`,
        '"""',
        "",
        "Завдання: дай КОРОТКУ граматичну формулу для цієї підтеми.",
        "- Якщо формула вже присутня у тексті — витягни та нормалізуй її.",
        "- Якщо формули немає — склади коротку формулу на основі теми.",
        "Формат: використовуй скорочення Subject/S, V1/V2/V3, V-ing та символи + і /.",
        "Приклади: \"S + have/has + V3\", \"am/is/are + V-ing\", \"If + Present Simple, will + V1\".",
        "",
        'Поверни JSON у форматі: { "formula": "..." }',
      ].join("\n"),
    },
  ];
}

function parseJSONResponse(text: string): Record<string, unknown> {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI response does not contain JSON");
    }
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function parseTranslation(text: string): string {
  const value = parseJSONResponse(text).translation;
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("AI response JSON is missing a non-empty 'translation' string");
  }
  return value;
}

function parseFormula(text: string): string {
  const value = parseJSONResponse(text).formula;
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("AI response JSON is missing a non-empty 'formula' string");
  }
  return value.trim();
}

function cleanFormulaLine(line: string): string {
  return line
    .trim()
    .replace(/^#+\s*/, "")
    .replace(/^[-*•\d.)\s]+/, "")
    .replace(/^\(\s*[+?\-]\s*\)\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(
      /^(Ствердження|Заперечення|Питання|Affirmative|Negative|Questions|Структура|Structure|Форма|Формула|Формули)\s*[:：]\s*/i,
      ""
    )
    .trim();
}

function hasExampleTranslation(line: string): boolean {
  return (
    /\([^)]*[а-яіїєґ][^)]*\)/.test(line) &&
    /[A-Za-z]{2,}/.test(line) &&
    !line.includes("+")
  );
}

function formulaScore(line: string): number {
  let score = 0;
  if (line.includes("+")) score += 4;
  if (/\b(Subject|Підмет)\b/i.test(line)) score += 2;
  if (/\bV-?(ing|[123])\b/i.test(line)) score += 2;
  if (
    /\b(am|is|are|was|were|do|does|did|have|has|had|will|would|can|could|should|must|may|might)\b/i.test(
      line
    )
  ) {
    score += 1;
  }
  if (line.length <= 80) score += 1;
  return score;
}

function isFormulaLike(line: string): boolean {
  if (line.length < 3 || line.length > 100) return false;
  if (hasExampleTranslation(line)) return false;
  return (
    line.includes("+") ||
    /\bV-?(ing|[123])\b/i.test(line) ||
    /\b(am|is|are)\s*\/\s*(is|are)/.test(line)
  );
}

const FORMULA_SECTION_STOP =
  /^(Приклад|Приклади|Важливо|Використання|Скорочен|Розподіл|Особлив|Зверніть|Запам|Порад|Різниця|Значення|Вживання|Форми|Таблиц|Формули|Тип)/i;

function extractFormula(rule: RuleContent): string | null {
  const lines = rule.full.split("\n");
  const index = lines.findIndex((line) => /Формул|Formula/i.test(line));
  if (index < 0) return null;

  const candidates: string[] = [];
  const inline = (lines[index] ?? "")
    .replace(/^.*?(Формул[а-яіїє]*|Formula)[^\n:]*:\s*/i, "")
    .trim();
  if (inline.length > 0) candidates.push(inline);

  for (let i = index + 1; i < lines.length && i < index + 5; i += 1) {
    const line = lines[i]?.trim() ?? "";
    if (line.length === 0) break;
    if (FORMULA_SECTION_STOP.test(line)) break;
    candidates.push(line);
  }

  const cleaned = candidates
    .map(cleanFormulaLine)
    .filter(isFormulaLike)
    .sort((a, b) => formulaScore(b) - formulaScore(a));

  return cleaned[0] ?? null;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function saveRules(rules: RulesFile): Promise<void> {
  await writeFile(rulesPath, `${JSON.stringify(rules, null, 2)}\n`, "utf-8");
}

function reorderRules(rules: RulesFile): RulesFile {
  const out: RulesFile = {};
  for (const [level, topics] of Object.entries(rules)) {
    const levelOut: RulesFile[string] = {};
    for (const [topic, subtopics] of Object.entries(topics)) {
      const topicOut: (typeof levelOut)[string] = {};
      for (const [subtopic, rule] of Object.entries(subtopics)) {
        topicOut[subtopic] = {
          formula: rule.formula ?? "",
          short: rule.short,
          full: rule.full,
        };
      }
      levelOut[topic] = topicOut;
    }
    out[level] = levelOut;
  }
  return out;
}

function collectTranslationTargets(rules: RulesFile): TranslationTarget[] {
  const targets: TranslationTarget[] = [];
  for (const [level, topics] of Object.entries(rules)) {
    for (const [topic, subtopics] of Object.entries(topics)) {
      for (const [subtopic, rule] of Object.entries(subtopics)) {
        for (const field of ["short", "full"] as TextField[]) {
          if (!CYRILLIC.test(rule[field])) {
            targets.push({
              label: `${level} / ${topic} / ${subtopic} / ${field}`,
              field,
              rule,
            });
          }
        }
      }
    }
  }
  return targets;
}

function collectFormulaTargets(rules: RulesFile): FormulaTarget[] {
  const targets: FormulaTarget[] = [];
  for (const [level, topics] of Object.entries(rules)) {
    for (const [topic, subtopics] of Object.entries(topics)) {
      for (const [subtopic, rule] of Object.entries(subtopics)) {
        if (typeof rule.formula !== "string" || rule.formula.length === 0) {
          targets.push({
            level,
            topic,
            subtopic,
            label: `${level} / ${topic} / ${subtopic}`,
            rule,
          });
        }
      }
    }
  }
  return targets;
}

async function translateEnglishFields(rules: RulesFile): Promise<number> {
  const targets = collectTranslationTargets(rules);
  console.log(`[rules] translation: ${targets.length} purely-English fields`);

  let done = 0;
  let failed = 0;
  for (const target of targets) {
    try {
      const result = await completeWithFallback(
        buildTranslationMessages(target.rule[target.field]),
        { temperature: 0.2, maxTokens: 4000 }
      );
      target.rule[target.field] = parseTranslation(result.text);
      await saveRules(rules);
      done += 1;
      console.log(
        `[rules] ✔ translate ${target.label} (${result.provider}, ${done}/${targets.length})`
      );
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[rules] ✘ translate ${target.label}: ${message}`);
    }
    await delay(REQUEST_DELAY_MS);
  }
  return failed;
}

async function addFormulas(rules: RulesFile): Promise<number> {
  const targets = collectFormulaTargets(rules);
  console.log(`[rules] formula: ${targets.length} rules need a formula`);

  let extracted = 0;
  let generated = 0;
  let failed = 0;

  for (const target of targets) {
    const local = extractFormula(target.rule);
    if (local) {
      target.rule.formula = local;
      await saveRules(rules);
      extracted += 1;
      console.log(`[rules] ✔ formula ${target.label} (extracted)`);
      continue;
    }

    try {
      const result = await completeWithFallback(buildFormulaMessages(target), {
        temperature: 0.2,
        maxTokens: 300,
      });
      target.rule.formula = parseFormula(result.text);
      await saveRules(rules);
      generated += 1;
      console.log(
        `[rules] ✔ formula ${target.label} (${result.provider}, ${generated})`
      );
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[rules] ✘ formula ${target.label}: ${message}`);
    }

    await delay(REQUEST_DELAY_MS);
  }

  console.log(
    `[rules] formula done: ${extracted} extracted, ${generated} generated, ${failed} failed`
  );
  return failed;
}

async function main(): Promise<void> {
  const rules = JSON.parse(await readFile(rulesPath, "utf-8")) as RulesFile;

  const translationFailed = await translateEnglishFields(rules);
  const formulaFailed = await addFormulas(rules);

  await saveRules(reorderRules(rules));
  console.log(`[rules] saved to ${rulesPath}`);

  if (translationFailed > 0 || formulaFailed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[rules] fatal:", error);
  process.exit(1);
});
