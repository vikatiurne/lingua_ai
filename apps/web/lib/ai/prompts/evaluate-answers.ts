export type EvaluateSentenceInput = {
  id: string;
  source: string;
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
    '- "reference" — the correct translation,',
    '- "userAnswer" — the student\'s answer.',
    'If "userAnswer" is "...", the student skipped the sentence because they did not know the word or translation.',
    "",
    "Evaluate each sentence separately. Rules:",
    '- "isCorrect": true only if "userAnswer" matches "reference" in meaning and grammar (minor punctuation or capitalization differences are acceptable).',
    '- "errorType": "topic" if the mistake concerns the topic being studied (wrong word or meaning for this topic), "grammar" for general grammar or spelling mistakes, "skipped" if the student answered "...", "none" if the answer is correct.',
    '- "explanation": 1-2 short sentences in Ukrainian explaining the mistake and stating the correct form. For skipped sentences, explain what the correct translation is.',
    '- If "errorType" is "skipped", also include "vocabularyToAdd" with the word from "source" that the student should learn and its Ukrainian translation.',
    '- "topicScore": integer 0-100 — percentage of sentences translated correctly with respect to this topic.',
    '- "grammarScore": integer 0-100 — percentage reflecting overall grammar and spelling accuracy across all answers. It may be higher or lower than "topicScore".',
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
