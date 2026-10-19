import type { CEFRLevel } from "@lingua/shared";

export type ExercisePromptParams = {
  level: CEFRLevel;
  topic: string;
  subtopic: string;
  ukEnCount: number;
  enUkCount: number;
  hint: string;
  examples: string[];
  pastErrors: string[];
};

export function getPrompt(params: ExercisePromptParams): string {
  const lines: string[] = [
    "You are an English teacher. Generate " +
      `${params.ukEnCount} Ukrainian sentences to translate to English, ` +
      `and ${params.enUkCount} English sentences to translate to Ukrainian.`,
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
    "Return ONLY a valid JSON object in this format: " +
      '{ "sentences": [{ "source": "...", "reference": "...", "direction": "uk_en" }] } ' +
      'where "source" is the sentence to translate, "reference" is the correct ' +
      'translation of "source" into the other language, and direction is "uk_en" ' +
      '(Ukrainian to English) or "en_uk" (English to Ukrainian).'
  );

  return lines.join("\n");
}
