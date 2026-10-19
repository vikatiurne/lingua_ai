import { readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { completeWithFallback, type AIMessage } from "./lib/ai-client.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rulesPath = resolve(repoRoot, "data", "rules.json");
const progressPath = resolve(repoRoot, "data", ".fix-formulas-progress.json");

const REQUEST_DELAY_MS = 4500;
const MAX_ATTEMPTS = 2;

type RuleContent = {
  formula?: string;
  short: string;
  full: string;
};

type RulesFile = {
  [level: string]: {
    [topic: string]: {
      [subtopic: string]: RuleContent;
    };
  };
};

type FormulaKind = "affirmative" | "negative" | "questions" | "mixed" | "neutral";

type FormulaTarget = {
  label: string;
  level: string;
  topic: string;
  subtopic: string;
  rule: RuleContent;
};

const CYRILLIC = /[\u0400-\u04FF]/;
const NON_ASCII = /[^\x00-\x7F]/;

const TYPE_HINTS: Record<FormulaKind, string> = {
  affirmative:
    "Тип підтеми: стверджувальна форма — формула НЕ повинна містити not і НЕ повинна закінчуватися знаком ?.",
  negative:
    "Тип підтеми: заперечна форма — формула ОБОВ'ЯЗКОВО має містити not.",
  questions:
    "Тип підтеми: питальна форма — формула ОБОВ'ЯЗКОВО має закінчуватися знаком ?.",
  mixed:
    "Тип підтеми: поєднує заперечення та питання — наведи обидві частини через / (заперечна містить not, питальна закінчується знаком ?).",
  neutral:
    "Тип підтеми: нейтральний — подай базову структуру без зайвих позначок.",
};

function classifySubtopic(subtopic: string): FormulaKind {
  const questions = /question|interrogat/i.test(subtopic);
  const negative = /negative|negation/i.test(subtopic);
  const positive = /affirmative|positive/i.test(subtopic);

  if (positive && negative) return "neutral";
  if (questions && negative) return "mixed";
  if (questions) return "questions";
  if (negative) return "negative";
  if (positive) return "affirmative";
  return "neutral";
}

function buildFormulaMessages(
  target: FormulaTarget,
  kind: FormulaKind
): AIMessage[] {
  return [
    {
      role: "system",
      content:
        "Ти — викладач англійської мови. Відповідаєш тільки валідним JSON без пояснень, коментарів і без Markdown-обгортачок.",
    },
    {
      role: "user",
      content: [
        `Тема: "${target.topic}"; підтема: "${target.subtopic}" (рівень CEFR ${target.level}).`,
        TYPE_HINTS[kind],
        "",
        "Текст правила:",
        '"""',
        target.rule.short,
        "",
        target.rule.full,
        '"""',
        "",
        "Завдання: склади ОДНУ коротку граматичну формулу для цієї підтеми за строгим стандартом:",
        "1. Використовуй ВИКЛЮЧНО англійські лінгвістичні скорочення:",
        "   S (Subject), V1 (base verb), V2 (past verb), V3 (past participle), V-ing, O (Object), N (Noun), Adj (Adjective), Adv (Adverb), Aux (auxiliary).",
        "2. Жодних українських слів і жодних повних англійських речень.",
        "3. З'єднуй частини знаком +; альтернативи — знаком /.",
        "4. Не став крапку в кінці формули.",
        "",
        'Приклади: "S + have/has + V3", "S + do/does + not + V1", "Did + S + V1?", "am/is/are + V-ing", "S + V1 (he/she/it + V1-s)".',
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

function parseFormula(text: string): string {
  const value = parseJSONResponse(text).formula;
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("AI response JSON is missing a non-empty 'formula' string");
  }
  return value;
}

function normalizeFormula(raw: string, kind: FormulaKind): string {
  let formula = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim()
    .replace(/^["'«»]+|["'«»]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.;,]+$/, "")
    .trim();

  formula = formula.replace(/\s*\+\s*/g, " + ").trim();

  if (kind === "questions" && !formula.endsWith("?")) {
    formula = `${formula.replace(/\?+$/, "")}?`;
  }

  return formula;
}

function formulaProblems(formula: string, kind: FormulaKind): string[] {
  const issues: string[] = [];
  if (formula.length === 0) {
    issues.push("порожня формула");
    return issues;
  }
  if (/[\u0400-\u04FF]/.test(formula)) {
    issues.push("містить українські символи");
  } else if (/[^\x00-\x7F]/.test(formula)) {
    issues.push("містить не-ASCII символи");
  }

  const lower = formula.toLowerCase();
  if (kind === "negative" && !/\bnot\b/.test(lower)) {
    issues.push("заперечна формула без not");
  }
  if (kind === "questions" && !formula.endsWith("?")) {
    issues.push("питальна формула без ?");
  }
  if (kind === "affirmative" && (/\bnot\b/.test(lower) || formula.includes("?"))) {
    issues.push("стверджувальна формула містить not або ?");
  }
  return issues;
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

function collectTargets(rules: RulesFile): FormulaTarget[] {
  const targets: FormulaTarget[] = [];
  for (const [level, topics] of Object.entries(rules)) {
    for (const [topic, subtopics] of Object.entries(topics)) {
      for (const [subtopic, rule] of Object.entries(subtopics)) {
        targets.push({
          label: `${level} / ${topic} / ${subtopic}`,
          level,
          topic,
          subtopic,
          rule,
        });
      }
    }
  }
  return targets;
}

async function loadProgress(): Promise<Set<string>> {
  try {
    const raw = await readFile(progressPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((x): x is string => typeof x === "string"));
    }
  } catch {
    // no progress yet
  }
  return new Set();
}

async function saveProgress(done: Set<string>): Promise<void> {
  await writeFile(progressPath, `${JSON.stringify([...done], null, 2)}\n`, "utf-8");
}

async function main(): Promise<void> {
  const rules = JSON.parse(await readFile(rulesPath, "utf-8")) as RulesFile;
  const targets = collectTargets(rules);
  const done = await loadProgress();
  const pending = targets.filter((t) => !done.has(t.label));

  console.log(
    `[formulas] ${targets.length} rules total, ${pending.length} to regenerate (${done.size} resumed)`
  );

  let applied = 0;
  let warned = 0;
  let failed = 0;

  for (const target of pending) {
    const kind = classifySubtopic(target.subtopic);
    let candidate: string | null = null;
    let issues: string[] = [];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const result = await completeWithFallback(
          buildFormulaMessages(target, kind),
          { temperature: 0.2, maxTokens: 300 }
        );
        candidate = normalizeFormula(parseFormula(result.text), kind);
        issues = formulaProblems(candidate, kind);
        if (issues.length === 0) break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[formulas] ✘ ${target.label} (attempt ${attempt}): ${message}`);
        candidate = null;
        issues = ["помилка запиту"];
      }
      if (attempt < MAX_ATTEMPTS) await delay(REQUEST_DELAY_MS);
    }

    if (candidate) {
      target.rule.formula = candidate;
      done.add(target.label);
      await saveRules(rules);
      await saveProgress(done);
      if (issues.length === 0) {
        applied += 1;
        console.log(`[formulas] ✔ ${target.label} => ${candidate}`);
      } else {
        warned += 1;
        console.warn(
          `[formulas] ⚠ ${target.label} => ${candidate} (${issues.join("; ")})`
        );
      }
    } else {
      failed += 1;
      console.error(`[formulas] ✘ ${target.label}: не вдалося отримати формулу`);
    }

    await delay(REQUEST_DELAY_MS);
  }

  await saveRules(reorderRules(rules));

  if (pending.length === 0 || done.size === targets.length) {
    await rm(progressPath, { force: true });
  }

  console.log(
    `[formulas] done: ${applied} applied, ${warned} with warnings, ${failed} failed`
  );
  console.log(`[formulas] saved to ${rulesPath}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[formulas] fatal:", error);
  process.exit(1);
});
