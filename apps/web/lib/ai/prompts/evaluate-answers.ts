export type EvaluateSentenceInput = {
  id: string;
  source: string;
  direction: "uk_en" | "en_uk";
  reference: string;
  userAnswer: string;
};

export type EvaluatePromptParams = {
  topic: string;
  sentences: EvaluateSentenceInput[];
};

export function getPrompt(params: EvaluatePromptParams): string {
  const lines: string[] = [
    "You are an English teacher evaluating a student's translation exercise.",
    `Topic: ${params.topic}.`,
    "",
    "For each sentence below you receive:",
    '- "source" — the original sentence to translate,',
    '- "direction" — "uk_en" (Ukrainian to English, the answer is in English) or "en_uk" (English to Ukrainian, the answer is in Ukrainian),',
    '- "reference" — the correct translation,',
    '- "userAnswer" — the student\'s answer.',
    'If "userAnswer" is "...", the student skipped the sentence because they did not know the word or translation.',
    "Note: \"userAnswer\" and \"reference\" have been normalized (lowercased, punctuation removed, apostrophes kept). Judge meaning and grammar, not formatting.",
    "",
    "Evaluate each sentence separately. Rules:",
    '- "isCorrect": true only if "userAnswer" matches "reference" in meaning and grammar (minor punctuation or capitalization differences are acceptable).',
    '- Accept synonymous grammatical structures (e.g., \'to do\' and \'in order to do\' are both correct).',
    '- Treat contractions and full forms as identical (e.g., \'I\'m\' = \'I am\', \'don\'t\' = \'do not\').',
    '- If the user\'s answer conveys the exact same meaning and is grammatically correct, mark it as `isCorrect: true`, even if it differs from the reference. Ignore minor stylistic differences.',
    '- "errorType" — exactly one of "topic", "spelling", "vocabulary", "grammar", "skipped", "none":',
    '  - "topic" — the mistake concerns the topic being studied (wrong word or meaning for this topic);',
    '  - "grammar" — a structural grammar mistake in the English answer (direction "uk_en" only);',
    '  - "spelling" — a typo or spelling mistake in an English word, e.g. "scool" instead of "school" (direction "uk_en" only);',
    '  - "vocabulary" — the wrong word was chosen, so the meaning does not match (not a typo; direction "uk_en" only);',
    '  - "skipped" — the student answered "...";',
    '  - "none" — the answer is correct.',
    '- If the direction is \'en_uk\' (English to Ukrainian), DO NOT penalize for grammatical, spelling, or punctuation errors in the Ukrainian translation. The user\'s answer is correct if it accurately conveys the meaning of the English source sentence. You may add a short note in "explanation" about Ukrainian spelling without marking the sentence incorrect.',
    '- If the direction is \'uk_en\', distinguish between \'spelling\' errors (typos, e.g., \'scool\' instead of \'school\') and \'vocabulary\' errors (wrong word choice). Use \'grammar\' only for structural mistakes in English.',
    '- "explanation": 1-2 short sentences in Ukrainian explaining the mistake and stating the correct form. For skipped sentences, explain what the correct translation is.',
    '- If "errorType" is "skipped", also include "vocabularyToAdd" with the word from "source" that the student should learn and its Ukrainian translation.',
    '- "topicScore": integer 0-100 — percentage of sentences translated correctly with respect to this topic.',
    '- "grammarScore": integer 0-100 — percentage reflecting overall grammar and spelling accuracy across all answers. It may be higher or lower than "topicScore".',
    "- The grammarScore must be strictly derived from the evaluated sentences.",
    "- If all sentences have isCorrect: true, the grammarScore MUST be 100.",
    "- If there are errors, deduct points proportionally to the number of sentences with errors.",
    "- Do not deduct points for stylistic choices if you marked the sentence as correct.",
    '- Do not deduct points from "grammarScore" for Ukrainian spelling, grammar, or punctuation mistakes in sentences with direction "en_uk".',
    "",
    "Sentences to evaluate (JSON):",
    JSON.stringify(params.sentences, null, 2),
    "",
    "Return ONLY a valid JSON object in this format: " +
      '{ "topicScore": 0, "grammarScore": 0, "evaluatedSentences": ' +
      '[{ "id": "1", "isCorrect": false, "errorType": "grammar", ' +
      '"explanation": "...", "vocabularyToAdd": { "word": "...", "translation": "..." } }] } ' +
      'where "vocabularyToAdd" is optional and included only for "skipped" sentences, ' +
      'and "evaluatedSentences" must contain exactly one entry for every sentence id from the input.',
  ];

  return lines.join("\n");
}
