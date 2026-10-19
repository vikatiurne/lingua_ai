import type { CEFRLevel } from "@lingua/shared";

export type ExercisePromptParams = {
  level: CEFRLevel;
  topic: string;
  subtopic: string;
  uaEnCount: number;
  enUaCount: number;
  hint: string;
  examples: string[];
  pastErrors: string[];
};

export function getPrompt(params: ExercisePromptParams): string {
  const lines: string[] = [
    "You are an English teacher. Generate " +
      `${params.uaEnCount} Ukrainian sentences to translate to English, ` +
      `and ${params.enUaCount} English sentences to translate to Ukrainian.`,
    `Topic: ${params.topic} (${params.subtopic}), Level: ${params.level}.`,
    `Must follow these rules: ${params.hint}.`,
    `Base your style on these examples: ${params.examples.join(" ")}`,
  ];

  if (params.pastErrors.length > 0) {
    lines.push(
      "Important: Include these past mistakes/sentences to test the student again: " +
        params.pastErrors.join(" ")
    );
  }

  lines.push(
    'Return ONLY a valid JSON object in this format: ' +
      '{ "sentences": [{ "source": "...", "direction": "uk_en" }] } ' +
      'where direction is "uk_en" (Ukrainian to English) or "en_uk" (English to Ukrainian).'
  );

  return lines.join("\n");
}
