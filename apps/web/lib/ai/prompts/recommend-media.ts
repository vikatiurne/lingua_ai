import { MATERIAL_TYPE_VALUES } from "@lingua/shared";
import type { CEFRLevel } from "@lingua/shared";
import { formatLevelCode } from "@/lib/level";

export type RecommendMediaPromptParams = {
  topicName: string;
  subtopicName?: string | null;
  level: CEFRLevel;
};

export function getPrompt(params: RecommendMediaPromptParams): string {
  const lines: string[] = [
    "You are an English teacher recommending real-world media to practice a grammar topic.",
    `Topic: ${params.topicName}.`,
  ];

  if (params.subtopicName) {
    lines.push(`Subtopic: ${params.subtopicName}.`);
  }

  lines.push(
    `CEFR level: ${formatLevelCode(params.level)}.`,
    "",
    "Recommend 2-3 real, well-known media items (films, series, podcasts, books, videos, or articles) " +
      "where the target topic is used heavily and the content is approachable for this CEFR level.",
    `Each item's "type" must be exactly one of: ${MATERIAL_TYPE_VALUES.join(", ")}.`,
    'The "url" must be a real, stable URL (official site, streaming page, or a web search query URL).',
    'The "description" must be 1-2 short sentences in Ukrainian explaining why this media helps practice the topic.',
    "",
    "Return ONLY a valid JSON array in this format: " +
      '[{ "title": "...", "type": "film", "description": "...", "url": "https://..." }]',
  );

  return lines.join("\n");
}
