export type SubstitutionCheckInput = {
  id: string;
  source: string;
  reference: string;
  userAnswer: string;
  expected: string;
  actual: string;
};

export function getSubstitutionVerificationPrompt(
  items: SubstitutionCheckInput[]
): string {
  return [
    "You check whether a student's word is an acceptable alternative translation in context.",
    "",
    "For every item you receive: the source sentence, the reference translation, the student's full answer, the word expected from the reference, and the word the student used instead.",
    "",
    "Decide ONLY this: in this sentence, can the student's word (\"actual\") replace the expected word (\"expected\") without changing the meaning or breaking the sentence?",
    "- Valid synonyms and equally correct alternatives → true.",
    "- Common valid pairs in context: \"understand\" ≈ \"know\", \"learn\" ≈ \"study\", \"like\" ≈ \"love\", \"still\" ≈ \"also\" when the meaning is the same.",
    "- Wrong meaning, wrong part of speech, or an unrelated word → false.",
    "- If the student's word is a minor misspelling of a valid alternative → true.",
    "- Do not judge any other mistakes in the answer.",
    "",
    "Items (JSON):",
    JSON.stringify(items, null, 2),
    "",
    "Return ONLY a valid JSON object in this exact format: " +
      '{ "results": [{ "id": "1", "acceptable": true }] } ' +
      "with exactly one result for every item id, copying the id exactly.",
  ].join("\n");
}

export type EvaluateSentenceInput = {
  id: string;
  source: string;
  direction: "uk_en" | "en_uk";
  reference: string;
  acceptedVariants: string[];
  userAnswer: string;
};

export type EvaluatePromptParams = {
  topic: string;
  rule?: { formula: string; short: string };
  sentences: EvaluateSentenceInput[];
};

export function getPrompt(params: EvaluatePromptParams): string {
  const lines: string[] = [
    "You are an English teacher evaluating a student's translation exercise.",
    `Topic: ${params.topic}.`,
    ...(params.rule
      ? [`Target grammar rule: ${params.rule.formula}. ${params.rule.short}`]
      : []),
    "",
    "CRITICAL LANGUAGE RULE: every human-readable text you write (meaning, note) MUST be in Ukrainian. Never write explanations in English.",
    "",
    "You DO NOT classify mistakes into sections. Report RAW corrections and let the app classify them. Return a review for EVERY sentence in exactly this shape:",
    '{',
    '  "id": "sentence id",',
    '  "topic": { "mastered": true | false, "violation": { "wrong": "exact fragment from userAnswer (may be empty)", "correct": "correct fragment" } },',
    '  "corrections": [',
    '    { "wrong": "exact fragment from userAnswer, empty string if the word is missing", "correct": "corrected English word or phrase", "meaning": "Ukrainian meaning (only for vocabulary corrections)", "note": "optional short Ukrainian note" }',
    '  ]',
    '}',
    "",
    "RULES FOR CORRECTIONS:",
    '- "wrong" MUST be copied exactly from "userAnswer", keeping the student\'s spelling. Use "" when the student omitted the word or replaced it with "...".',
    '- "correct" is the corrected English word or short phrase (1-3 words) taken from the English side of the task: "reference" for uk_en, "source" for en_uk.',
    '- Report every real mistake exactly once. Never repeat the same correction in several entries.',
    '- NEVER report a word the student already wrote correctly. Valid synonyms and equally natural alternatives are NOT mistakes — do not report them.',
    '- Ignore capitalization and punctuation.',
    '- Do not report a preposition/article/function word when the student\'s choice is also natural in this sentence.',
    '- A misspelling of a real English word: "wrong" is the misspelled form, "correct" is the right spelling.',
    '- A content word with a different meaning: "wrong" is the student\'s word, "correct" is the English word, "meaning" is its Ukrainian meaning in this sentence.',
    '- For direction "en_uk" report ONLY meaning mistakes: "wrong" is the student\'s Ukrainian word (or "" when absent), "correct" is the English word from the source, "meaning" is what it means in Ukrainian. NEVER grade Ukrainian grammar, spelling or punctuation. A correct Ukrainian synonym is not a mistake.',
    '- A partial answer with "..." is NOT skipped: report each missing word/phrase as a correction with "wrong": "". Only an answer that is exactly "..." (or "не знаю" / "I don\'t know") is skipped — then list 1-3 key English words with "wrong": "".',
    '- Function words such as to, the, a, in, at, of are still reported as corrections when they are genuinely wrong or missing; the app will classify them as grammar.',
    '- "meaning" must be the real Ukrainian meaning, never a status label like "неправильне слово" or "пропущено".',
    '- Keep 1-4 corrections per sentence. Never list the whole sentence word by word.',
    "",
    "RULES FOR TOPIC:",
    '- Judge ONLY the target grammar rule above. "mastered": false ONLY when that construction is wrong.',
    '- If the answer is correct for the target rule, set "mastered": true and DO NOT include a "violation" field.',
    '- If mastered is false, "violation" is required and BOTH "wrong" and "correct" must be non-empty strings: "wrong" is the student\'s fragment from userAnswer, "correct" is the fixed fragment from the reference. Never reuse examples from these instructions. Do not write a prose explanation.',
    '- Everything else — prepositions, articles, agreement outside the target, vocabulary — must NOT make the topic fail. Put those in "corrections" only.',
    '- If the target construction is replaced by "..." and cannot be judged, set "mastered": true.',
    "",
    "Scores:",
    '- "topicScore": integer 0-100 — percentage of sentences with "topic".mastered = true.',
    '- "grammarScore": integer 0-100 — overall grammar and spelling accuracy across all answers.',
    "- If every sentence has no corrections, BOTH scores MUST be 100.",
    "",
    "Sentences to evaluate (JSON):",
    JSON.stringify(params.sentences, null, 2),
    "",
    "Return ONLY a valid JSON object in this exact format: " +
      '{ "topicScore": <0-100>, "grammarScore": <0-100>, "evaluatedSentences": ' +
      '[{ "id": "<sentence id>", "topic": { "mastered": true }, "corrections": [{ "wrong": "<fragment>", "correct": "<fragment>", "meaning": "<uk translation>" }] }] } ' +
      "with exactly one entry for every sentence id from the input. When mastered is false, include \"violation\": { \"wrong\": \"<fragment>\", \"correct\": \"<fragment>\" } with non-empty strings.",
  ];

  return lines.join("\n");
}

export type TranslationCheckInput = {
  id: string;
  source: string;
  userAnswer: string;
  word: string;
  translation: string;
};

export function getTranslationVerificationPrompt(
  items: TranslationCheckInput[]
): string {
  return [
    "You check whether a student's Ukrainian translation conveys the meaning of a given English word.",
    "",
    "For every item you receive: the English source sentence, the student's Ukrainian answer, the English word flagged by the evaluator, and its expected Ukrainian meaning.",
    "",
    "Decide ONLY this: does the student's answer contain an acceptable Ukrainian translation of that English word in this sentence?",
    "- Be lenient: any Ukrainian word or phrase that conveys the same meaning counts, even if it is not the wording from the expected translation.",
    "- Example: for \"learn\" both «дізнаємося» and «вчимо» / «вивчаємо» are acceptable; for \"appreciate\" «цінуємо» is acceptable, while «вдячні» (grateful) is a different meaning.",
    "- If the student's answer already conveys the meaning with a correct synonym → true.",
    "- The meaning is absent or translated with a different meaning → false.",
    "- The student may have omitted other parts of the sentence (marked with \"...\") — ignore that; judge only this word's meaning.",
    "- Do not judge grammar or spelling.",
    "",
    "Items (JSON):",
    JSON.stringify(items, null, 2),
    "",
    "Return ONLY a valid JSON object in this exact format: " +
      '{ "results": [{ "id": "1", "acceptable": true }] } ' +
      "with exactly one result for every item id, copying the id exactly.",
  ].join("\n");
}

export type MissingWordCheckInput = {
  id: string;
  source: string;
  reference: string;
  userAnswer: string;
  word: string;
};

export function getMissingWordVerificationPrompt(
  items: MissingWordCheckInput[]
): string {
  return [
    "You check an English word that the reference translation contains but the student's answer seems to omit.",
    "",
    "For every item you receive: the source sentence, the reference translation, the student's answer and the English word from the reference.",
    "",
    "Important: judge only the student's answer. A word is NOT conveyed just because the source sentence or the reference contains it — the student must have expressed its meaning in the answer.",
    "",
    "Decide:",
    '1. "conveyed": does the student\'s answer already express this word\'s meaning, even with different wording or a valid synonym? If yes, set true. A correct synonym counts: "understand" is conveyed by "know", "learn" by "study", "convenient" by "comfortable", "still" by "also".',
    '2. "translation": if not conveyed, give the Ukrainian meaning of this English word AS USED IN THIS SENTENCE.',
    '3. "actual": if the student wrote a different word or short phrase (1-3 words) instead of this word, copy exactly that word/phrase from the answer. Never copy a whole clause or sentence, and never include "...". If they simply omitted it, use an empty string.',
    '4. "confident": true only when you are sure that the word is needed and the translation is correct; if the wording is ambiguous or could be a valid synonym → set false.',
    "",
    "Do not report grammar, spelling or other words. Ignore gaps marked with \"...\" in other parts of the sentence.",
    "",
    "Items (JSON):",
    JSON.stringify(items, null, 2),
    "",
    "Return ONLY a valid JSON object in this exact format: " +
      '{ "results": [{ "id": "1", "conveyed": false, "confident": true, "translation": "менш", "actual": "few" }] } ' +
      "with exactly one result for every item id, copying the id exactly.",
  ].join("\n");
}

export type GapFillInput = {
  id: string;
  source: string;
  reference: string;
  userAnswer: string;
  missing: string[];
};

// Fallback for answers where the student left "..." gaps but the evaluator did
// not return the missing vocabulary. The `missing` list comes from a
// deterministic diff between the reference and the answer, so the model only
// has to map each missing Ukrainian phrase to the English source word.
export function getGapFillPrompt(items: GapFillInput[]): string {
  return [
    "A student translated a sentence but left \"...\" gaps in the answer.",
    "",
    "For every item you receive: the English source sentence, the reference translation, the student's answer with gaps, and \"missing\" — Ukrainian words/phrases that the reference contains but the answer omits.",
    "",
    "For every phrase in \"missing\", find the English word or short phrase (1-3 words) from the English side of the exercise that this Ukrainian phrase translates, with its Ukrainian meaning in this sentence.",
    "",
    "Rules:",
    '- Return exactly one entry per meaningful phrase in \"missing\". Copy that phrase into "source".',
    '- "word" MUST be copied from the English side of the exercise. Never invent a word that is not there.',
    '- Skip function words and phrases that have no meaningful English counterpart (articles, pronouns, prepositions).',
    '- Do not return a word whose meaning the student already wrote elsewhere in the answer.',
    '- "translation" must be the real Ukrainian meaning of this word in this sentence, never a status label.',
    '- "confident": true only when the mapping is clear; set false if the phrase is ambiguous.',
    "",
    "Items (JSON):",
    JSON.stringify(items, null, 2),
    "",
    "Return ONLY a valid JSON object in this exact format: " +
      '{ "results": [{ "id": "1", "words": [{ "source": "середовищі", "word": "environment", "translation": "середовище", "confident": true }] }] } ' +
      "with exactly one result for every item id.",
  ].join("\n");
}

export type GapWordInput = {
  id: string;
  direction: "uk_en" | "en_uk";
  source: string;
  reference: string;
  userAnswer: string;
  gaps: number;
};

// Guarantees a vocabulary card for every explicit "..." gap: asks which
// English word the student most likely did not know at each gap.
export function getGapWordPrompt(items: GapWordInput[]): string {
  return [
    'A student translated a sentence and put "..." where they did not know a word.',
    "",
    'For every item you receive: "direction" ("uk_en" = Ukrainian → English, "en_uk" = English → Ukrainian), the source sentence, the reference translation, the answer with gaps, and the number of gaps.',
    "",
    'For every gap, name the English word (1-3 words) the student most likely failed to produce at that position.',
    "",
    "Rules:",
    '- Return exactly one entry per gap, in order ("index" starts at 1).',
    '- "word" MUST be copied from the English sentence of the exercise: "source" for en_uk, "reference" for uk_en. Never invent a word that is not there.',
    '- Pick the meaningful content word at that gap, not a bare article/preposition/auxiliary verb.',
    '- If the gap covers a phrase like "will read", return only "read"; never return an all-function-word phrase such as "you will".',
    '- Do not return a word that the student already wrote in the English answer.',
    '- "translation" must be the real Ukrainian meaning of this word in this sentence, never a status label.',
    '- "confident": true unless the gap is genuinely ambiguous.',
    "",
    "Items (JSON):",
    JSON.stringify(items, null, 2),
    "",
    "Return ONLY a valid JSON object in this exact format: " +
      '{ "results": [{ "id": "1", "gaps": [{ "index": 1, "word": "promotion", "translation": "підвищення", "confident": true }] }] } ' +
      "with exactly one result for every item id.",
  ].join("\n");
}
