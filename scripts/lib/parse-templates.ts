import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CEFR_LEVEL, type CEFRLevel } from "@lingua/shared";

export type ParsedSubtopic = {
  name: string;
};

export type ParsedTopic = {
  name: string;
  subtopics: ParsedSubtopic[];
};

export type ParsedTemplateFile = {
  level: CEFRLevel;
  topics: ParsedTopic[];
};

export const LEVEL_FILES: Record<CEFRLevel, string> = {
  [CEFR_LEVEL.A1]: "templates_a1.json",
  [CEFR_LEVEL.A2]: "templates_a2.json",
  [CEFR_LEVEL.A2_PLUS]: "templates_a2_plus.json",
  [CEFR_LEVEL.B1]: "templates_b1_advanced.json",
  [CEFR_LEVEL.B1_PLUS]: "templates_b1_plus.json",
  [CEFR_LEVEL.B2]: "templates_b2.json",
  [CEFR_LEVEL.C1]: "templates_c1.json",
  [CEFR_LEVEL.C2]: "templates_c2.json",
};

export async function parseAllTemplates(
  dataDir = "data"
): Promise<ParsedTemplateFile[]> {
  const result: ParsedTemplateFile[] = [];

  for (const [level, filename] of Object.entries(LEVEL_FILES)) {
    const path = join(dataDir, filename);
    const raw = await readFile(path, "utf-8");
    const json = JSON.parse(raw) as {
      topics?: Array<{
        topic: string;
        subtopics?: Array<{ name: string }>;
      }>;
    };

    const topics: ParsedTopic[] = (json.topics ?? []).map((t) => ({
      name: t.topic,
      subtopics: (t.subtopics ?? []).map((s) => ({ name: s.name })),
    }));

    result.push({ level: level as CEFRLevel, topics });
  }

  return result;
}
