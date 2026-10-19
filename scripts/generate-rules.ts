import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAllTemplates } from "./lib/parse-templates.js";
import {
  completeWithFallback,
  type AIMessage,
} from "./lib/ai-client.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = resolve(repoRoot, "data");
const rulesPath = join(dataDir, "rules.json");

const REQUEST_DELAY_MS = 4500;

type RuleContent = {
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

type SubtopicKey = {
  level: string;
  topic: string;
  subtopic: string;
};

async function loadRules(): Promise<RulesFile> {
  try {
    const raw = await readFile(rulesPath, "utf-8");
    return JSON.parse(raw) as RulesFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function saveRules(rules: RulesFile): Promise<void> {
  await mkdir(dirname(rulesPath), { recursive: true });
  await writeFile(rulesPath, `${JSON.stringify(rules, null, 2)}\n`, "utf-8");
}

async function collectSubtopics(): Promise<SubtopicKey[]> {
  const parsed = await parseAllTemplates(dataDir);
  const seen = new Set<string>();
  const keys: SubtopicKey[] = [];

  for (const file of parsed) {
    for (const topic of file.topics) {
      for (const subtopic of topic.subtopics) {
        const id = `${file.level}::${topic.name}::${subtopic.name}`;
        if (seen.has(id)) continue;
        seen.add(id);
        keys.push({
          level: file.level,
          topic: topic.name,
          subtopic: subtopic.name,
        });
      }
    }
  }

  return keys;
}

function buildMessages(key: SubtopicKey): AIMessage[] {
  return [
    {
      role: "system",
      content:
        "Ти — викладач англійської мови. Відповідаєш тільки валідним JSON без пояснень і без Markdown-обгортачок.",
    },
    {
      role: "user",
      content: [
        `Напиши правило для теми "${key.topic}" / підтеми "${key.subtopic}" (рівень CEFR ${key.level}).`,
        'Поверни JSON у форматі: { "short": "1-2 речення суті правила українською", "full": "Повне правило з поясненням та прикладами речень (Markdown: \\n для переносів, - для списків)" }.',
      ].join("\n\n"),
    },
  ];
}

function parseRuleContent(text: string): RuleContent {
  const trimmed = text.trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(withoutFences);
  } catch {
    const match = withoutFences.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI response does not contain JSON");
    }
    parsed = JSON.parse(match[0]);
  }

  const rule = parsed as { short?: unknown; full?: unknown };
  if (typeof rule.short !== "string" || typeof rule.full !== "string") {
    throw new Error("AI response JSON is missing short/full string fields");
  }
  if (rule.short.length === 0 || rule.full.length === 0) {
    throw new Error("AI response JSON has empty short/full fields");
  }

  return { short: rule.short, full: rule.full };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const keys = await collectSubtopics();
  const rules = await loadRules();

  const missing = keys.filter(
    (key) => typeof rules[key.level]?.[key.topic]?.[key.subtopic] !== "object"
  );

  console.log(
    `[generate-rules] ${keys.length} subtopics total, ${missing.length} missing`
  );

  if (missing.length === 0) {
    console.log("[generate-rules] nothing to generate");
    return;
  }

  let generated = 0;
  let failed = 0;

  for (const key of missing) {
    const label = `${key.level} / ${key.topic} / ${key.subtopic}`;
    try {
      const result = await completeWithFallback(buildMessages(key), {
        temperature: 0.3,
        maxTokens: 1500,
      });
      const rule = parseRuleContent(result.text);

      const levelRules = (rules[key.level] ??= {});
      const topicRules = (levelRules[key.topic] ??= {});
      topicRules[key.subtopic] = rule;
      await saveRules(rules);

      generated += 1;
      console.log(
        `[generate-rules] ✔ ${label} (${result.provider}, ${generated}/${missing.length})`
      );
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[generate-rules] ✘ ${label}: ${message}`);
    }

    await delay(REQUEST_DELAY_MS);
  }

  console.log(
    `[generate-rules] done: ${generated} generated, ${failed} failed, saved to ${rulesPath}`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[generate-rules] fatal:", error);
  process.exit(1);
});
