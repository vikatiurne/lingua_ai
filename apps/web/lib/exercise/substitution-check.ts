import { describe, expect, it } from "vitest";
import { diffAnswer } from "./diff";
import { normalizeAnswerText } from "./answer-match";
import { STOPWORDS } from "./words";

export const MAX_SUBSTITUTION_CANDIDATES = 12;
export const MAX_MISSING_CANDIDATES = 8;
const MAX_MISSING_PER_SENTENCE = 4;

export type SubstitutionCandidate = {
  id: string;
  key: string;
  sentenceId: string;
  source: string;
  reference: string;
  userAnswer: string;
  expected: string;
  actual: string;
};

export type TranslationCandidate = {
  id: string;
  key: string;
  sentenceId: string;
  source: string;
  userAnswer: string;
  word: string;
  translation: string;
};

type SentenceLike = {
  id: string;
  direction: "uk_en" | "en_uk";
  source: string;
  reference: string;
  userAnswer?: string;
};

type EvaluationLike = {
  isCorrect: boolean;
  skipped: boolean;
  topicMastered: boolean;
  vocabularyIssues: {
    word: string;
    translation: string;
    actual?: string;
    note?: string;
  }[];
};

export function substitutionKey(
  sentenceId: string,
  expected: string,
  actual: string
): string {
  return `${sentenceId}|${normalizeAnswerText(expected)}|${normalizeAnswerText(actual)}`;
}

export function translationKey(sentenceId: string, word: string): string {
  return `${sentenceId}|${normalizeAnswerText(word)}`;
}

// Collects places where the student wrote a different word instead of a
// reference word the AI flagged as a vocabulary issue. Only those need a
// second opinion: is the replacement an acceptable alternative in context?
export function collectSubstitutionCandidates(
  sentences: SentenceLike[],
  evaluations: Map<string, EvaluationLike>
): SubstitutionCandidate[] {
  const candidates: SubstitutionCandidate[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    if (sentence.direction !== "uk_en") continue;
    const evaluation = evaluations.get(sentence.id);
    if (!evaluation || evaluation.skipped) continue;
    if (evaluation.vocabularyIssues.length === 0) continue;

    const diff = diffAnswer(sentence.reference, sentence.userAnswer ?? "");
    for (const issue of evaluation.vocabularyIssues) {
      const expected = normalizeAnswerText(issue.word);
      const substitution = issue.actual
        ? { expected: issue.word, actual: issue.actual }
        : diff.substitutions.find(
            (pair) => normalizeAnswerText(pair.expected) === expected
          );
      if (!substitution) continue;

      const key = substitutionKey(
        sentence.id,
        substitution.expected,
        substitution.actual
      );
      if (seen.has(key)) continue;
      seen.add(key);

      candidates.push({
        id: String(candidates.length + 1),
        key,
        sentenceId: sentence.id,
        source: sentence.source,
        reference: sentence.reference,
        userAnswer: sentence.userAnswer ?? "",
        expected: substitution.expected,
        actual: substitution.actual,
      });
      if (candidates.length >= MAX_SUBSTITUTION_CANDIDATES) return candidates;
    }
  }

  return candidates;
}

// en_uk issues cannot be diffed word-by-word (the answer is Ukrainian), so
// each flagged English word gets a contextual check: does the answer convey
// its meaning at all? Valid translations are not "missing words".
export function collectTranslationCandidates(
  sentences: SentenceLike[],
  evaluations: Map<string, EvaluationLike>
): TranslationCandidate[] {
  const candidates: TranslationCandidate[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    if (sentence.direction !== "en_uk") continue;
    const evaluation = evaluations.get(sentence.id);
    if (!evaluation || evaluation.skipped) continue;

    for (const issue of evaluation.vocabularyIssues) {
      const key = translationKey(sentence.id, issue.word);
      if (seen.has(key)) continue;
      seen.add(key);

      candidates.push({
        id: String(candidates.length + 1),
        key,
        sentenceId: sentence.id,
        source: sentence.source,
        userAnswer: sentence.userAnswer ?? "",
        word: issue.word,
        translation: issue.translation,
      });
      if (candidates.length >= MAX_SUBSTITUTION_CANDIDATES) return candidates;
    }
  }

  return candidates;
}

export type MissingWordCandidate = {
  id: string;
  sentenceId: string;
  source: string;
  reference: string;
  userAnswer: string;
  word: string;
  actual?: string;
};

// Reference words the student did not write at all (uk_en). The model may have
// missed them, so they get translated in one batched call. Words already in
// the review, function words and words fixed as typos are skipped.
export function collectMissingCandidates(
  sentences: SentenceLike[],
  evaluations: Map<string, EvaluationLike>
): MissingWordCandidate[] {
  const candidates: MissingWordCandidate[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    if (sentence.direction !== "uk_en") continue;
    const evaluation = evaluations.get(sentence.id);
    if (!evaluation || evaluation.skipped || evaluation.isCorrect) continue;
    // A topic mistake usually explains the wording difference; adding cards
    // for the same words on top of it only creates noise.
    if (!evaluation.topicMastered) continue;

    const diff = diffAnswer(sentence.reference, sentence.userAnswer ?? "");
    const known = new Set(
      evaluation.vocabularyIssues.map((issue) =>
        normalizeAnswerText(issue.word)
      )
    );
    for (const pair of diff.typoPairs) {
      known.add(normalizeAnswerText(pair.correct));
    }

    let perSentence = 0;
    for (const word of diff.missing) {
      if (perSentence >= MAX_MISSING_PER_SENTENCE) break;
      const key = normalizeAnswerText(word);
      if (!key || key.length < 2) continue;
      if (STOPWORDS.has(key) || known.has(key)) continue;
      if (seen.has(`${sentence.id}|${key}`)) continue;

      seen.add(`${sentence.id}|${key}`);
      perSentence += 1;
      candidates.push({
        id: String(candidates.length + 1),
        sentenceId: sentence.id,
        source: sentence.source,
        reference: sentence.reference,
        userAnswer: sentence.userAnswer ?? "",
        word,
        actual: diff.substitutions.find(
          (pair) => normalizeAnswerText(pair.expected) === key
        )?.actual,
      });
      if (candidates.length >= MAX_MISSING_CANDIDATES) return candidates;
    }
  }

  return candidates;
}

export const MAX_GAP_CANDIDATES = 8;

export type GapCandidate = {
  id: string;
  sentenceId: string;
  source: string;
  reference: string;
  userAnswer: string;
  missing: string[];
};

// Answers with unfilled "..." gaps but no vocabulary entries from the model.
// en_uk is included: the missing words live on the English side and are still
// worth a vocabulary card when the model failed to report them.
export function collectGapCandidates(
  sentences: SentenceLike[],
  evaluations: Map<string, EvaluationLike>
): GapCandidate[] {
  const candidates: GapCandidate[] = [];

  for (const sentence of sentences) {
    if (sentence.direction !== "en_uk") continue;
    const evaluation = evaluations.get(sentence.id);
    if (!evaluation || evaluation.skipped) continue;
    const gaps = ((sentence.userAnswer ?? "").match(/\.{3,}|…/g) ?? []).length;
    if (gaps === 0) continue;
    // Always run: existing cards may not cover the actual gap words (the model
    // often cards a different word). Duplicates are filtered later by `known`.

    // Pair across "..." here: the reference and the answer are both
    // Ukrainian, so words next to a gap are real substitutions, not noise.
    // That keeps words the student actually conveyed out of the missing list
    // (e.g. "learn" when the answer says «вчимо»).
    const diff = diffAnswer(sentence.reference, sentence.userAnswer ?? "", {
      pairEllipsisGaps: true,
    });
    const substituted = new Set(
      diff.substitutions.map((pair) => normalizeAnswerText(pair.expected))
    );
    const missing = diff.missing.filter(
      (word, index, list) =>
        word.length >= 2 &&
        list.indexOf(word) === index &&
        // Paired substitutions are handled by the translation verification,
        // not by gap filling.
        !substituted.has(normalizeAnswerText(word))
    );
    if (missing.length === 0) continue;

    candidates.push({
      id: String(candidates.length + 1),
      sentenceId: sentence.id,
      source: sentence.source,
      reference: sentence.reference,
      userAnswer: sentence.userAnswer ?? "",
      missing,
    });
    if (candidates.length >= MAX_GAP_CANDIDATES) break;
  }

  return candidates;
}

export type GapWordCandidate = {
  id: string;
  sentenceId: string;
  direction: "uk_en" | "en_uk";
  source: string;
  reference: string;
  userAnswer: string;
  gaps: number;
};

// Answers that still have "..." but no vocabulary card at all. The explicit
// gap means the student did not know the word, so we always try to name it.
export function collectUnfilledGapCandidates(
  sentences: SentenceLike[],
  evaluations: Map<string, EvaluationLike>
): GapWordCandidate[] {
  const candidates: GapWordCandidate[] = [];

  for (const sentence of sentences) {
    const evaluation = evaluations.get(sentence.id);
    if (!evaluation || evaluation.skipped || evaluation.isCorrect) continue;
    const gaps = ((sentence.userAnswer ?? "").match(/\.{3,}|…/g) ?? []).length;
    if (gaps === 0) continue;
    const gapCards = evaluation.vocabularyIssues.filter((issue) =>
      (issue.note ?? "").includes("пропущено")
    ).length;
    if (gapCards >= gaps) continue;

    candidates.push({
      id: String(candidates.length + 1),
      sentenceId: sentence.id,
      direction: sentence.direction,
      source: sentence.source,
      reference: sentence.reference,
      userAnswer: sentence.userAnswer ?? "",
      gaps,
    });
    if (candidates.length >= MAX_GAP_CANDIDATES) break;
  }

  return candidates;
}
