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
    "Every sentence MUST include a non-empty \"reference\" — the full correct " +
      "translation of \"source\" into the other language. For direction \"uk_en\" " +
      "the source is Ukrainian and the reference must be the complete English " +
      "translation; for direction \"en_uk\" the source is English and the reference " +
      "must be the complete Ukrainian translation. Never omit or empty the reference.",
    "Also include \"acceptedVariants\": an array with 1-2 other full translations " +
      "of the same source that are equally correct (different wording or valid " +
      "synonyms, e.g. \"comfortable\" instead of \"convenient\"). They must be in " +
      "the same language as \"reference\", mean exactly the same thing, and differ " +
      "from the reference. Use an empty array when there is no natural alternative.",
    "",
    "Return ONLY a valid JSON object in this format: " +
      '{ "sentences": [{ "source": "...", "reference": "...", "direction": "uk_en", "acceptedVariants": ["..."] }] } ' +
      'where "source" is the sentence to translate, "reference" is the correct ' +
      'translation of "source" into the other language, direction is "uk_en" ' +
      '(Ukrainian to English) or "en_uk" (English to Ukrainian), and ' +
      '"acceptedVariants" lists other correct translations (may be empty).'
  );

  return lines.join("\n");
}
