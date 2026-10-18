import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type RuleContent = {
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

function resolveDataDir(): string {
  const envDir = process.env.DATA_DIR;
  if (envDir && envDir.trim().length > 0) {
    return envDir;
  }
  // Resolve <root>/data from apps/web/lib/rules/loader.ts
  const currentFile = fileURLToPath(import.meta.url);
  return join(dirname(currentFile), "../../../../data");
}

const DATA_DIR = resolveDataDir();

const FALLBACK_RULE: RuleContent = {
  short: "Правило генерується...",
  full: "Повне правило буде доступне незабаром.",
};

let rulesCache: RulesFile | null = null;

async function loadRulesFile(): Promise<RulesFile> {
  if (rulesCache) {
    return rulesCache;
  }
  const filePath = join(DATA_DIR, "rules.json");
  const content = await readFile(filePath, "utf-8");
  rulesCache = JSON.parse(content) as RulesFile;
  return rulesCache;
}

export async function loadRule(
  level: string,
  topic: string,
  subtopic: string
): Promise<RuleContent> {
  const rules = await loadRulesFile();
  const rule = rules[level]?.[topic]?.[subtopic];
  if (rule && typeof rule.short === "string" && typeof rule.full === "string") {
    return rule;
  }
  return FALLBACK_RULE;
}

export function clearRulesCache(): void {
  rulesCache = null;
}
