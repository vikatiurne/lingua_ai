import { z } from "zod";
import {
  ERROR_CATEGORY,
  SENTENCE_ERROR_TYPE_VALUES,
  type ErrorCategory,
  type EvaluatedSentence,
} from "@lingua/shared";
import { prisma } from "@/lib/db/client";
import { completeCached } from "@/lib/ai/cached";
import { logAIRequest } from "@/lib/ai/logger";
import type { AIMessage } from "@/lib/ai/types";
import {
  getGapFillPrompt,
  getGapWordPrompt,
  getMissingWordVerificationPrompt,
  getPrompt,
  getSubstitutionVerificationPrompt,
  getTranslationVerificationPrompt,
  type GapFillInput,
  type GapWordInput,
  type MissingWordCheckInput,
  type SubstitutionCheckInput,
  type TranslationCheckInput,
} from "@/lib/ai/prompts/evaluate-answers";
import {
  matchesAcceptedAnswer,
  normalizeAnswerText as normalizeText,
} from "@/lib/exercise/answer-match";
import {
  buildTopicNote,
  classifyCorrections,
  isTopicDuplicate,
} from "@/lib/exercise/corrections";
import { diffAnswer, tokenize } from "@/lib/exercise/diff";
import { isFallbackReference } from "@/lib/exercise/fallback";
import {
  INVALID_EXERCISE_MESSAGE,
  UNANSWERED_EXERCISE_MESSAGE,
  hasUnansweredSentences,
  parseStoredSentences,
  type StoredSentence,
} from "@/lib/exercise/stored-sentences";
import {
  collectGapCandidates,
  collectMissingCandidates,
  collectSubstitutionCandidates,
  collectTranslationCandidates,
  collectUnfilledGapCandidates,
  substitutionKey,
  translationKey,
} from "@/lib/exercise/substitution-check";
import { STOPWORDS } from "@/lib/exercise/words";
import { loadRule } from "@/lib/rules/loader";

const AI_TIMEOUT_MS = 10000;
const AI_TEMPERATURE = 0.2;
const SKIPPED_ANSWER = "...";
const MAX_ISSUES_PER_SENTENCE = 4;

const vocabularyIssueSchema = z.object({
  word: z.string().min(1),
  translation: z.string().optional(),
  note: z.string().optional(),
});

const spellingIssueSchema = z.object({
  wrong: z.string().min(1),
  correct: z.string().min(1),
  translation: z.string().optional(),
});

const topicViolationSchema = z.object({
  wrong: z.string().optional(),
  correct: z.string().min(1),
});

const rawCorrectionSchema = z.object({
  wrong: z.string().optional(),
  correct: z.string().min(1),
  meaning: z.string().optional(),
  note: z.string().optional(),
});

const evaluatedSentenceSchema = z.object({
  id: z.string().min(1),
  // The verdict is derived from the structured fields, `isCorrect` is only
  // honored for the legacy free-form format.
  isCorrect: z.boolean().optional(),
  errorType: z.enum(SENTENCE_ERROR_TYPE_VALUES).optional(),
  topic: z
    .object({
      mastered: z.boolean(),
      note: z.string().optional(),
      violation: topicViolationSchema.optional(),
    })
    .optional(),
  // New shape: the model reports raw corrections, the app classifies them.
  corrections: z.array(rawCorrectionSchema).max(10).optional(),
  vocabularyIssues: z.array(vocabularyIssueSchema).max(10).optional(),
  grammarIssues: z.array(z.string()).max(10).optional(),
  spellingIssues: z.array(spellingIssueSchema).max(10).optional(),
  // Legacy shape — tolerated so an older model still produces a usable result.
  explanation: z.string().optional(),
  vocabularyToAdd: z
    .array(
      z.object({
        word: z.string().min(1),
        translation: z.string().min(1),
      })
    )
    .max(10)
    .optional(),
});

const evaluationResponseSchema = z.object({
  topicScore: z.number().min(0).max(100),
  grammarScore: z.number().min(0).max(100),
  evaluatedSentences: z.array(evaluatedSentenceSchema).min(1),
});

const substitutionVerificationSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      acceptable: z.boolean(),
    })
  ),
});

const missingWordVerificationSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      conveyed: z.boolean(),
      confident: z.boolean(),
      translation: z.string().optional(),
      actual: z.string().optional(),
    })
  ),
});

const gapFillSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      words: z.array(
        z.object({
          source: z.string().optional(),
          word: z.string(),
          translation: z.string().optional(),
          confident: z.boolean().optional(),
        })
      ),
    })
  ),
});

const gapWordSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      gaps: z.array(
        z.object({
          index: z.number(),
          word: z.string(),
          translation: z.string().optional(),
          confident: z.boolean().optional(),
        })
      ),
    })
  ),
});

export type { EvaluatedSentence };

export type EvaluationResult = {
  topicScore: number;
  grammarScore: number;
  evaluatedSentences: EvaluatedSentence[];
};

export class ExerciseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExerciseValidationError";
  }
}

type ParsedResponse = z.infer<typeof evaluationResponseSchema>;
type ParsedSentence = z.infer<typeof evaluatedSentenceSchema>;

type AcceptedFixes = {
  substitutions?: ReadonlySet<string>;
  translations?: ReadonlySet<string>;
  extraVocabulary?: Map<string, VocabularyIssue[]>;
};

type VocabularyIssue = {
  word: string;
  translation: string;
  note: string;
  actual?: string;
};
type SpellingIssue = { wrong: string; correct: string; translation: string };

type EvaluatedEntry = {
  id: string;
  isCorrect: boolean;
  errorType: EvaluatedSentence["errorType"];
  explanation: string;
  topicMastered: boolean;
  topicNote: string;
  skipped: boolean;
  vocabularyToAdd: { word: string; translation: string }[];
  vocabularyIssues: VocabularyIssue[];
  grammarIssues: string[];
  grammarHasEllipsis: boolean;
  unfilledGaps: boolean;
  spellingIssues: SpellingIssue[];
  structured: boolean;
};

type UserErrorRow = {
  userId: string;
  exerciseId: string;
  type: "topic" | "general";
  category: ErrorCategory | null;
  sentence: string;
  userAnswer: string;
  reference: string;
  explanation: string;
  word: string | null;
  translation: string | null;
};

function normalizeLegacyDirection(sentence: StoredSentence): StoredSentence {
  if (sentence.direction !== "uk_en" || normalizeText(sentence.reference)) {
    return sentence;
  }
  if (hasCyrillic(sentence.source)) {
    return sentence;
  }
  return { ...sentence, direction: "en_uk" };
}

export async function evaluateExercise(exerciseId: string): Promise<EvaluationResult> {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
  });
  if (!exercise) {
    throw new Error("Exercise not found");
  }

  const parsedSentences = parseStoredSentences(exercise.sentences);
  if (!parsedSentences) {
    throw new ExerciseValidationError(INVALID_EXERCISE_MESSAGE);
  }
  if (hasUnansweredSentences(parsedSentences)) {
    throw new ExerciseValidationError(UNANSWERED_EXERCISE_MESSAGE);
  }

  const storedSentences = parsedSentences.map(normalizeLegacyDirection);
  const referenceById = new Map(
    storedSentences.map((sentence) => [sentence.id, sentence.reference])
  );
  const sentences = storedSentences.map((sentence) =>
    isFallbackReference(sentence.reference)
      ? { ...sentence, reference: "" }
      : sentence
  );

  const rule = exercise.subtopicName
    ? await loadRule(exercise.level, exercise.topicName, exercise.subtopicName)
    : null;
  const prompt = getPrompt({
    topic: exercise.topicName,
    rule: rule?.formula
      ? { formula: rule.formula, short: rule.short }
      : undefined,
    sentences: sentences.map((sentence) => ({
      id: sentence.id,
      source: sentence.source,
      direction: sentence.direction,
      reference: isFallbackReference(sentence.reference)
        ? ""
        : normalizeText(sentence.reference),
      acceptedVariants: (sentence.acceptedVariants ?? []).map((variant) =>
        normalizeText(variant)
      ),
      userAnswer: normalizeForPrompt(sentence.userAnswer),
    })),
  });

  const raw = await requestEvaluation(prompt);

  let parsed = await parseEvaluationResponse(prompt, raw);
  let evaluatedById = buildEvaluatedMap(parsed, sentences);

  const missing = sentences.filter((sentence) => !evaluatedById.has(sentence.id));
  if (missing.length > 0) {
    const error = new Error(
      `AI did not evaluate sentences: ${missing.map((s) => s.id).join(", ")}`
    );
    logEvaluationError("incomplete AI response", error);
    throw error;
  }

  // One corrective retry when the model ignores the structured format or
  // breaks a hard rule (common with smaller models).
  const violations = findViolations(sentences, evaluatedById);
  if (violations.length > 0) {
    logEvaluationError("rule violations from AI", new Error(violations.join("; ")));
    try {
      const retryRaw = await requestEvaluation(
        `${prompt}\n\nYour previous response violated these rules:\n${violations
          .map((v) => `- ${v}`)
          .join("\n")}\nReturn the full corrected JSON object only.`
      );
      const retryParsed = parseResponse(retryRaw);
      const retryMap = buildEvaluatedMap(retryParsed, sentences);
      if (
        retryMap.size === sentences.length &&
        findViolations(sentences, retryMap).length === 0
      ) {
        parsed = retryParsed;
        evaluatedById = retryMap;
      }
    } catch (error) {
      logEvaluationError("corrective retry failed", error);
    }
  }

  // A synonym can look like a vocabulary mistake to the evaluator. Ask the
  // model once per direction whether each flagged word is actually present /
  // acceptable, and drop the issue when it is. Failures keep the AI verdict.
  const [
    acceptedSubstitutions,
    acceptedTranslations,
    extraVocabulary,
    gapVocabulary,
  ] = await Promise.all([
    verifySubstitutions(sentences, evaluatedById),
    verifyTranslations(sentences, evaluatedById),
    suggestMissingVocabulary(sentences, evaluatedById),
    fillGapVocabulary(sentences, evaluatedById),
  ]);
  for (const [sentenceId, issues] of gapVocabulary) {
    extraVocabulary.set(sentenceId, [
      ...(extraVocabulary.get(sentenceId) ?? []),
      ...issues,
    ]);
  }
  if (
    acceptedSubstitutions.size > 0 ||
    acceptedTranslations.size > 0 ||
    extraVocabulary.size > 0
  ) {
    evaluatedById = buildEvaluatedMap(parsed, sentences, {
      substitutions: acceptedSubstitutions,
      translations: acceptedTranslations,
      extraVocabulary,
    });
  }

  // A gap without any card means both the model and the deterministic pass
  // failed. Ask once which word the student did not know, so the review always
  // shows a translation and the word lands in vocabulary.
  const fallbackGapVocabulary = await fillUnfilledGapVocabulary(
    sentences,
    evaluatedById
  );
  if (fallbackGapVocabulary.size > 0) {
    for (const [sentenceId, issues] of fallbackGapVocabulary) {
      extraVocabulary.set(sentenceId, [
        ...(extraVocabulary.get(sentenceId) ?? []),
        ...issues,
      ]);
    }
    evaluatedById = buildEvaluatedMap(parsed, sentences, {
      substitutions: acceptedSubstitutions,
      translations: acceptedTranslations,
      extraVocabulary,
    });
  }

  // Topic mastery is judged per sentence (target rule only), so the score is
  // derived from those verdicts, not from the model's arithmetic.
  const topicScore = Math.round(
    (100 *
      sentences.filter((sentence) => evaluatedById.get(sentence.id)?.topicMastered)
        .length) /
      sentences.length
  );

  // The AI may understate grammarScore as an abstract grade.
  // Enforce consistency with the derived per-sentence verdicts.
  const grammarScore = sentences.every(
    (sentence) => evaluatedById.get(sentence.id)?.isCorrect
  )
    ? 100
    : parsed.grammarScore;

  const updatedSentences = sentences.map((sentence) => {
    const evaluation = evaluatedById.get(sentence.id)!;
    return {
      ...sentence,
      reference: referenceById.get(sentence.id) ?? sentence.reference,
      userAnswer: normalizeAnswer(sentence.userAnswer),
      isCorrect: evaluation.isCorrect,
      errorType: evaluation.errorType,
      explanation: evaluation.explanation,
      vocabularyToAdd: evaluation.vocabularyToAdd,
    };
  });

  const userErrors = buildUserErrors(exercise, sentences, evaluatedById);

  await prisma.$transaction([
    prisma.userError.deleteMany({ where: { exerciseId: exercise.id } }),
    prisma.userError.createMany({ data: userErrors }),
    prisma.exercise.update({
      where: { id: exercise.id },
      data: {
        sentences: updatedSentences,
        topicScore,
        grammarScore,
        status: "evaluated",
      },
    }),
  ]);

  return {
    topicScore,
    grammarScore,
    evaluatedSentences: sentences.map((sentence) => {
      const evaluation = evaluatedById.get(sentence.id)!;
      return {
        id: evaluation.id,
        isCorrect: evaluation.isCorrect,
        errorType: evaluation.errorType,
        explanation: evaluation.explanation,
        ...(evaluation.vocabularyToAdd.length > 0 && {
          vocabularyToAdd: evaluation.vocabularyToAdd,
        }),
      };
    }),
  };
}

function normalizeEvaluation(
  raw: ParsedSentence,
  sentence: StoredSentence,
  accepted: AcceptedFixes = {}
): EvaluatedEntry {
  const structured =
    raw.topic !== undefined ||
    raw.corrections !== undefined ||
    raw.vocabularyIssues !== undefined ||
    raw.grammarIssues !== undefined ||
    raw.spellingIssues !== undefined;

  const answer = normalizeForPrompt(sentence.userAnswer);
  // Only a truly empty answer ("..." / "не знаю") is skipped. A partial
  // answer with "..." must still be evaluated for what the student wrote.
  const skipped = isSkippedAnswer(sentence.userAnswer);
  const reference = isFallbackReference(sentence.reference)
    ? ""
    : sentence.reference;
  const englishSide = normalizeText(
    sentence.direction === "uk_en" ? reference : sentence.source
  );

  // A wording that exactly matches the reference or any accepted variant is
  // correct by definition — no AI judgment can turn it into an error.
  if (
    matchesAcceptedAnswer(sentence.userAnswer, [
      reference,
      ...(sentence.acceptedVariants ?? []),
    ])
  ) {
    return {
      id: raw.id,
      isCorrect: true,
      errorType: "none",
      explanation: "",
      topicMastered: true,
      topicNote: "",
      skipped: false,
      vocabularyToAdd: [],
      vocabularyIssues: [],
      grammarIssues: [],
      grammarHasEllipsis: false,
      unfilledGaps: false,
      spellingIssues: [],
      structured,
    };
  }

  // New shape: the model returns raw corrections; categories are decided
  // deterministically here. Corrections that belong to the topic violation are
  // not repeated in grammar/vocabulary.
  const topicViolation = raw.topic?.violation;
  const answerTokenSet = new Set(tokenize(sentence.userAnswer ?? ""));
  const answerNormalized = normalizeText(sentence.userAnswer ?? "");
  const corrections = (raw.corrections ?? []).filter((correction) => {
    if (isTopicDuplicate(correction, topicViolation)) return false;
    const wrong = (correction.wrong ?? "").trim();
    if (wrong || sentence.direction !== "uk_en") return true;
    // "Missing" words must actually be absent — the model sometimes repeats a
    // word the student already wrote.
    const correct = (correction.correct ?? "").trim();
    if (!correct) return false;
    const tokens = tokenize(correct);
    if (tokens.length === 1) return !answerTokenSet.has(tokens[0]!);
    return !answerNormalized.includes(normalizeText(correct));
  });
  const classified = raw.corrections
    ? classifyCorrections(
        corrections,
        sentence.direction,
        sentence.userAnswer ?? ""
      )
    : null;

  // Cross-check with the deterministic diff (uk_en only, and only when the AI
  // already judged the sentence as incorrect): never report a word the student
  // actually wrote, and reclassify misspellings as spelling issues.
  const aiReportedProblems =
    raw.errorType !== undefined
      ? raw.errorType !== "none"
      : raw.isCorrect === false ||
        raw.topic?.mastered === false ||
        (raw.corrections?.length ?? 0) > 0 ||
        (raw.vocabularyIssues?.length ?? 0) > 0 ||
        (raw.grammarIssues?.length ?? 0) > 0 ||
        (raw.spellingIssues?.length ?? 0) > 0;

  const answerDiff =
    sentence.direction === "uk_en" && aiReportedProblems && !skipped
      ? diffAnswer(reference, sentence.userAnswer ?? "")
      : null;

  const rawVocabulary: {
    word: string;
    translation?: string;
    note: string;
    actual?: string;
  }[] = classified
    ? classified.vocabulary
    : (raw.vocabularyIssues ?? raw.vocabularyToAdd ?? []).map((issue) => ({
        word: issue.word,
        translation: issue.translation,
        note: vocabularyIssueNote({
          note: ("note" in issue ? (issue.note ?? "") : "").trim(),
          word: issue.word,
          direction: sentence.direction,
          answer,
          skipped,
          diff: answerDiff,
        }),
      }));

  const aiVocabularyIssues: VocabularyIssue[] = rawVocabulary
    .map((issue) => ({
      word: issue.word.trim(),
      translation: cleanTranslation(issue.translation),
      note: issue.note?.trim() ?? "",
      ...(issue.actual ? { actual: issue.actual } : {}),
    }))
    .filter((() => {
      const seen = new Set<string>();
      return (issue: VocabularyIssue): boolean => {
        const word = normalizeText(issue.word);
        if (!word || STOPWORDS.has(word) || seen.has(word)) return false;
        // A card without a Ukrainian meaning is useless; drop it and let the
        // deterministic missing-word pass add it back with a translation.
        if (!issue.translation || !hasCyrillic(issue.translation)) return false;
        // The entry must be an actual English word/phrase of this sentence —
        // the model tends to report the student's valid synonyms instead.
        if (!englishSide.includes(word)) return false;
        seen.add(word);
        return true;
      };
    })());

  const answerTokens = new Set(tokenize(sentence.userAnswer ?? ""));
  const answerText = normalizeText(sentence.userAnswer ?? "");
  const typoSpellingIssues: SpellingIssue[] = [];

  const baseVocabularyIssues = aiVocabularyIssues.filter((issue) => {
    // en_uk: a valid translation already in the answer is not missing.
    if (sentence.direction === "en_uk") {
      return !accepted.translations?.has(
        translationKey(sentence.id, issue.word)
      );
    }
    if (!answerDiff) return true;

    const tokens = tokenize(issue.word);
    if (tokens.length === 1 && answerTokens.has(tokens[0]!)) return false;
    if (tokens.length > 1 && answerText.includes(normalizeText(issue.word))) {
      return false;
    }
    const typo = answerDiff.typoPairs.find(
      (pair) => normalizeText(pair.correct) === normalizeText(issue.word)
    );
    if (typo) {
      typoSpellingIssues.push({
        wrong: typo.wrong,
        correct: issue.word,
        translation: issue.translation,
      });
      return false;
    }
    // A verified acceptable replacement is not a vocabulary mistake.
    const substitution = issue.actual
      ? { expected: issue.word, actual: issue.actual }
      : answerDiff.substitutions.find(
          (pair) => normalizeText(pair.expected) === normalizeText(issue.word)
        );
    if (
      substitution &&
      accepted.substitutions?.has(
        substitutionKey(
          sentence.id,
          substitution.expected,
          substitution.actual
        )
      )
    ) {
      return false;
    }
    return true;
  });

  const vocabularyIssues = mergeExtraVocabulary(
    baseVocabularyIssues,
    accepted.extraVocabulary?.get(sentence.id) ?? []
  );

  const rawSpelling = classified
    ? classified.spelling.map((issue) => ({
        wrong: issue.wrong,
        correct: issue.correct,
        translation: issue.translation,
      }))
    : (raw.spellingIssues ?? []).map((issue) => ({
        wrong: issue.wrong,
        correct: issue.correct,
        translation: issue.translation,
      }));

  const aiSpellingIssues: SpellingIssue[] = rawSpelling
    .map((issue) => ({
      wrong: issue.wrong.trim(),
      correct: issue.correct.trim(),
      translation: cleanTranslation(issue.translation),
    }))
    .filter((issue) => {
      if (!issue.wrong || !issue.correct) return false;
      // Ukrainian spelling is not graded (direction en_uk).
      if (sentence.direction !== "uk_en") return false;
      // Only correct towards a word the student was actually asked to write.
      // Otherwise the model invents a synonym that is not part of the task.
      return englishSide.includes(normalizeText(issue.correct));
    });

  const spellingIssues = dedupeSpellingIssues([
    ...aiSpellingIssues,
    ...typoSpellingIssues,
  ]);

  const rawGrammarIssues = classified
    ? classified.grammar.map((issue) => issue.trim()).filter(Boolean)
    : sentence.direction === "uk_en"
      ? (raw.grammarIssues ?? []).map((issue) => issue.trim()).filter(Boolean)
      : [];
  // A bare "..." in grammar is unusable for the student — keep the flag so
  // the corrective retry still fires, but never show the raw fragment.
  const grammarHasEllipsis = rawGrammarIssues.some((issue) =>
    issue.includes("...")
  );
  const grammarIssues = rawGrammarIssues.filter(
    (issue) => !issue.includes("...")
  );

  const topicViolationMissing = !topicViolation || !topicViolation.correct;
  const topicUnjudgeable =
    topicViolationMissing ||
    /^[\s.…]*$/.test((topicViolation?.wrong ?? "").trim());
  const gapCount = (answer.match(/\.{3,}|…/g) ?? []).length;
  // In en_uk a gap means the student could not translate part of the sentence:
  // the topic cannot be considered mastered, and the missing word must be
  // learned.
  const enUkGap = sentence.direction === "en_uk" && !skipped && gapCount > 0;
  const topicMastered = enUkGap
    ? false
    : classified
      ? sentence.direction === "en_uk"
        ? true
        : answer.includes("...") && topicUnjudgeable
          ? true
          : (raw.topic?.mastered ?? true)
      : raw.topic?.mastered ?? (raw.errorType !== "topic");
  const topicNote = topicMastered
    ? ""
    : enUkGap
      ? "є пропущені слова (…)"
      : stripSpellingFromNote(
          (
            classified
              ? buildTopicNote(topicViolation)
              : raw.topic?.note ?? ""
          ).trim(),
          spellingIssues
        ) || "є помилки за темою";

  // A partial answer with "..." is never fully correct: at minimum the student
  // left a gap. Normally the model or the gap-fill call provides a word card;
  // if both fail, keep the sentence incorrect and say so in the vocabulary line.
  const unfilledGaps =
    !skipped && answer.includes("...") && vocabularyIssues.length === 0;

  const isCorrect = structured
    ? !skipped &&
      topicMastered &&
      vocabularyIssues.length === 0 &&
      grammarIssues.length === 0 &&
      spellingIssues.length === 0 &&
      !unfilledGaps
    : Boolean(raw.isCorrect);

  const errorType = deriveErrorType({
    isCorrect,
    topicMastered,
    vocabularyIssues,
    grammarIssues,
    spellingIssues,
    skipped,
    unfilledGaps,
    fallback: raw.errorType ?? "none",
  });

  const vocabularyToAdd = [
    ...vocabularyIssues.map(({ word, translation }) => ({ word, translation })),
    // Function words fixed for spelling are not worth learning as vocabulary.
    ...spellingIssues
      .filter(
        (issue) =>
          !STOPWORDS.has(normalizeText(issue.correct)) &&
          // Only words that belong to this exercise are worth learning.
          englishSide.includes(normalizeText(issue.correct))
      )
      .map(({ correct, translation }) => ({
        word: correct,
        translation,
      })),
  ].filter((entry) => entry.word.length > 0);

  let explanation = structured
    ? buildExplanation(
        {
          topicMastered,
          topicNote,
          skipped,
          vocabularyIssues,
          grammarIssues,
          spellingIssues,
          unfilledGaps,
        },
        answer,
        sentence.direction
      )
    : (raw.explanation ?? "").trim();
  if (!explanation) {
    explanation = "Оцінено без AI";
  }

  return {
    id: raw.id,
    isCorrect,
    errorType,
    explanation,
    topicMastered,
    topicNote,
    skipped,
    vocabularyToAdd,
    vocabularyIssues,
    grammarIssues,
    grammarHasEllipsis,
    unfilledGaps,
    spellingIssues,
    structured,
  };
}

// Adds model-suggested missing words without duplicating or exceeding the cap.
function mergeExtraVocabulary(
  base: VocabularyIssue[],
  extra: VocabularyIssue[]
): VocabularyIssue[] {
  const merged = [...base];
  const seen = new Set(base.map((issue) => normalizeText(issue.word)));
  for (const issue of extra) {
    const key = normalizeText(issue.word);
    if (!key || STOPWORDS.has(key) || seen.has(key)) continue;
    seen.add(key);
    merged.push(issue);
    if (merged.length >= MAX_ISSUES_PER_SENTENCE) break;
  }
  return merged;
}

function vocabularyIssueNote(input: {
  note: string;
  word: string;
  direction: "uk_en" | "en_uk";
  answer: string;
  skipped: boolean;
  diff: ReturnType<typeof diffAnswer> | null;
}): string {
  if (input.skipped) return input.note;
  if (input.direction === "en_uk") return "";
  const word = normalizeText(input.word);
  const substitution = input.diff?.substitutions.find(
    (pair) => normalizeText(pair.expected) === word
  );
  if (substitution) {
    return `неправильне слово: «${substitution.actual}»`;
  }
  if (input.diff?.missing.includes(word)) {
    return "пропущено";
  }
  if (input.answer.includes("...")) return input.note;
  return "неправильне слово";
}

function dedupeSpellingIssues(issues: SpellingIssue[]): SpellingIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${normalizeText(issue.wrong)}|${normalizeText(issue.correct)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deriveErrorType(input: {
  isCorrect: boolean;
  topicMastered: boolean;
  vocabularyIssues: VocabularyIssue[];
  grammarIssues: string[];
  spellingIssues: SpellingIssue[];
  skipped: boolean;
  unfilledGaps: boolean;
  fallback: EvaluatedSentence["errorType"];
}): EvaluatedSentence["errorType"] {
  if (input.isCorrect) return "none";
  if (!input.topicMastered) return "topic";
  if (input.skipped) return "skipped";
  if (input.vocabularyIssues.length > 0) return "vocabulary";
  if (input.unfilledGaps) return "vocabulary";
  if (input.grammarIssues.length > 0) return "grammar";
  if (input.spellingIssues.length > 0) return "spelling";
  return input.fallback === "none" ? "grammar" : input.fallback;
}

// The explanation is assembled here, not by the model, so the format is
// identical regardless of the provider: topic / vocabulary / grammar / spelling.
function buildExplanation(
  evaluation: {
    topicMastered: boolean;
    topicNote: string;
    skipped: boolean;
    vocabularyIssues: VocabularyIssue[];
    grammarIssues: string[];
    spellingIssues: SpellingIssue[];
    unfilledGaps: boolean;
  },
  answer: string,
  direction: "uk_en" | "en_uk"
): string {
  const lines: string[] = [];

  if (evaluation.skipped) {
    lines.push("Тема: не перевірена — речення пропущено");
  } else if (evaluation.topicMastered) {
    lines.push(
      `Тема: засвоєна${evaluation.topicNote ? ` — ${evaluation.topicNote}` : ""}`
    );
  } else {
    lines.push(
      `Тема: не засвоєна${evaluation.topicNote ? ` — ${evaluation.topicNote}` : ""}`
    );
  }

  const hasWrongWord = evaluation.vocabularyIssues.some((issue) =>
    issue.note.includes("неправильне слово")
  );
  const vocabularyLabel = evaluation.skipped
    ? "Лексика (речення пропущено)"
    : evaluation.unfilledGaps ||
        (direction === "uk_en" && answer.includes("...") && !hasWrongWord)
      ? "Лексика (пропущено «...»)"
      : "Лексика";
  lines.push(
    `${vocabularyLabel}: ${
      evaluation.vocabularyIssues.length > 0
        ? evaluation.vocabularyIssues.map(formatVocabularyIssue).join("; ")
        : evaluation.unfilledGaps
          ? "не заповнено пропуск (…)"
          : "помилок немає"
    }`
  );

  lines.push(
    `Граматика: ${
      evaluation.grammarIssues.length > 0
        ? evaluation.grammarIssues.join("; ")
        : "помилок немає"
    }`
  );

  lines.push(
    `Правопис: ${
      evaluation.spellingIssues.length > 0
        ? evaluation.spellingIssues
            .map((issue) => `«${issue.wrong}» → «${issue.correct}»`)
            .join("; ")
        : "помилок немає"
    }`
  );

  return lines.join("\n");
}

function formatVocabularyIssue(issue: VocabularyIssue): string {
  const translation = issue.translation ? ` — «${issue.translation}»` : "";
  const note = issue.note ? ` (${issue.note})` : "";
  return `«${issue.word}»${translation}${note}`;
}

function buildUserErrors(
  exercise: { id: string; userId: string },
  sentences: StoredSentence[],
  evaluatedById: Map<string, EvaluatedEntry>
): UserErrorRow[] {
  return sentences.flatMap((sentence): UserErrorRow[] => {
    const evaluation = evaluatedById.get(sentence.id)!;
    if (evaluation.isCorrect) return [];

    const base = {
      userId: exercise.userId,
      exerciseId: exercise.id,
      sentence: sentence.source,
      userAnswer: normalizeAnswer(sentence.userAnswer),
      reference: sentence.reference,
      explanation: evaluation.explanation,
    };

    if (!evaluation.structured) {
      const type = evaluation.errorType === "topic" ? "topic" : "general";
      const category = LEGACY_CATEGORY_MAP[evaluation.errorType];
      if (evaluation.vocabularyToAdd.length === 0) {
        return [{ ...base, type, category, word: null, translation: null }];
      }
      return evaluation.vocabularyToAdd.map((entry) => ({
        ...base,
        type,
        category,
        word: entry.word,
        translation: entry.translation || null,
      }));
    }

    const rows: UserErrorRow[] = [];
    if (!evaluation.topicMastered) {
      rows.push({
        ...base,
        type: "topic",
        category: ERROR_CATEGORY.TOPIC,
        word: null,
        translation: null,
      });
    }
    for (const issue of evaluation.vocabularyIssues) {
      rows.push({
        ...base,
        type: "general",
        category: ERROR_CATEGORY.VOCABULARY,
        word: issue.word,
        translation: issue.translation || null,
      });
    }
    if (evaluation.grammarIssues.length > 0) {
      rows.push({
        ...base,
        type: "general",
        category: ERROR_CATEGORY.GRAMMAR,
        word: null,
        translation: null,
      });
    }
    for (const issue of evaluation.spellingIssues) {
      // Function words are not vocabulary to learn (kept only in the review
      // text), so they do not become spelling cards either.
      if (STOPWORDS.has(normalizeText(issue.correct))) continue;
      rows.push({
        ...base,
        type: "general",
        category: ERROR_CATEGORY.SPELLING,
        word: issue.correct,
        translation: issue.translation || null,
      });
    }
    if (rows.length === 0) {
      rows.push({
        ...base,
        type: "general",
        category: null,
        word: null,
        translation: null,
      });
    }
    return rows;
  });
}

const LEGACY_CATEGORY_MAP: Record<
  EvaluatedSentence["errorType"],
  ErrorCategory | null
> = {
  topic: ERROR_CATEGORY.TOPIC,
  spelling: ERROR_CATEGORY.SPELLING,
  vocabulary: ERROR_CATEGORY.VOCABULARY,
  grammar: ERROR_CATEGORY.GRAMMAR,
  skipped: ERROR_CATEGORY.VOCABULARY,
  none: null,
};

function normalizeAnswer(userAnswer: string | undefined): string {
  const trimmed = userAnswer?.trim();
  return trimmed ? trimmed : SKIPPED_ANSWER;
}

// The student skipped a sentence only when they wrote nothing meaningful.
// Any real words (even with "..." gaps) must be evaluated normally.
function isSkippedAnswer(userAnswer: string | undefined): boolean {
  const text = normalizeText(normalizeAnswer(userAnswer));
  if (!text) return true;
  return /^(не знаю|незнаю|не впевнений|не впевнена|i dont know|i don't know|idk)$/.test(
    text
  );
}

function normalizeForPrompt(userAnswer: string | undefined): string {
  const answer = normalizeAnswer(userAnswer);
  if (answer === SKIPPED_ANSWER) return SKIPPED_ANSWER;
  // Protect the "..." marker (unknown word inside the sentence) —
  // normalizeText strips dots, which would hide it from the AI.
  const placeholders: string[] = [];
  const protectedAnswer = answer.replace(/\.{3,}|\u2026/g, () => {
    const token = `\u0000${placeholders.length}\u0000`;
    placeholders.push("...");
    return token;
  });
  const normalized = normalizeText(protectedAnswer);
  return normalized.replace(
    /\u0000(\d+)\u0000/g,
    (_, i) => placeholders[Number(i)] ?? "..."
  );
}

async function callAI(messages: AIMessage[]): Promise<string> {
  const result = await completeCached(messages, {
    responseFormat: "json",
    temperature: AI_TEMPERATURE,
    timeoutMs: AI_TIMEOUT_MS,
    cacheTtlSeconds: 0,
  });
  return result.text;
}

async function requestEvaluation(prompt: string): Promise<string> {
  try {
    return await callAI([{ role: "user", content: prompt }]);
  } catch (error) {
    logEvaluationError("AI request failed", error);
    throw error;
  }
}

function parseResponse(raw: string): ParsedResponse {
  try {
    const json: unknown = JSON.parse(raw);
    return evaluationResponseSchema.parse(stripNullValues(json));
  } catch (error) {
    logEvaluationError("invalid JSON from AI", error);
    throw error;
  }
}

// A malformed response must not fail the whole evaluation: ask once more and
// hand the model the exact validation error.
async function parseEvaluationResponse(
  prompt: string,
  raw: string
): Promise<ParsedResponse> {
  try {
    return parseResponse(raw);
  } catch (error) {
    logEvaluationError("invalid AI response, retrying", error);
    const retryRaw = await requestEvaluation(
      `${prompt}\n\nYour previous response was rejected with this error:\n${
        error instanceof Error ? error.message : String(error)
      }\nReturn the full corrected JSON object only.`
    );
    return parseResponse(retryRaw);
  }
}

// The model sometimes sends `null` for an optional field ("violation": null)
// or a null element inside an array. Zod rejects both, so nulls are dropped
// before validation — the fields are optional anyway.
function stripNullValues(value: unknown): unknown {
  if (value === null) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((item) => stripNullValues(item))
      .filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = stripNullValues(item);
      if (cleaned !== undefined) result[key] = cleaned;
    }
    return result;
  }
  return value;
}

function buildEvaluatedMap(
  parsed: ParsedResponse,
  sentences: StoredSentence[],
  accepted?: AcceptedFixes
): Map<string, EvaluatedEntry> {
  const sentenceById = new Map(sentences.map((sentence) => [sentence.id, sentence]));
  const entries = parsed.evaluatedSentences
    .filter((sentence) => sentenceById.has(sentence.id))
    .map((sentence) =>
      normalizeEvaluation(sentence, sentenceById.get(sentence.id)!, accepted)
    );
  return new Map(entries.map((entry) => [entry.id, entry]));
}

async function verifySubstitutions(
  sentences: StoredSentence[],
  evaluatedById: Map<string, EvaluatedEntry>
): Promise<Set<string>> {
  const candidates = collectSubstitutionCandidates(sentences, evaluatedById);
  if (candidates.length === 0) return new Set();

  const items: SubstitutionCheckInput[] = candidates.map((candidate) => ({
    id: candidate.id,
    source: candidate.source,
    reference: candidate.reference,
    userAnswer: candidate.userAnswer,
    expected: candidate.expected,
    actual: candidate.actual,
  }));

  try {
    const raw = await callAI([
      { role: "user", content: getSubstitutionVerificationPrompt(items) },
    ]);
    const parsed = parseVerificationResponse(raw);
    const verdicts = new Map(
      parsed.results.map((result) => [result.id, result.acceptable])
    );
    const accepted = new Set<string>();
    for (const candidate of candidates) {
      if (verdicts.get(candidate.id) === true) {
        accepted.add(candidate.key);
      }
    }
    return accepted;
  } catch (error) {
    logEvaluationError("substitution verification failed", error);
    return new Set();
  }
}

async function verifyTranslations(
  sentences: StoredSentence[],
  evaluatedById: Map<string, EvaluatedEntry>
): Promise<Set<string>> {
  const candidates = collectTranslationCandidates(sentences, evaluatedById);
  if (candidates.length === 0) return new Set();

  const items: TranslationCheckInput[] = candidates.map((candidate) => ({
    id: candidate.id,
    source: candidate.source,
    userAnswer: candidate.userAnswer,
    word: candidate.word,
    translation: candidate.translation,
  }));

  try {
    const raw = await callAI([
      { role: "user", content: getTranslationVerificationPrompt(items) },
    ]);
    const parsed = parseVerificationResponse(raw);
    const verdicts = new Map(
      parsed.results.map((result) => [result.id, result.acceptable])
    );
    const accepted = new Set<string>();
    for (const candidate of candidates) {
      if (verdicts.get(candidate.id) === true) {
        accepted.add(candidate.key);
      }
    }
    return accepted;
  } catch (error) {
    logEvaluationError("translation verification failed", error);
    return new Set();
  }
}

// Fills gaps the model missed: reference words absent from the answer get a
// Ukrainian translation. Only confident, not-yet-conveyed words are added.
async function suggestMissingVocabulary(
  sentences: StoredSentence[],
  evaluatedById: Map<string, EvaluatedEntry>
): Promise<Map<string, VocabularyIssue[]>> {
  const candidates = collectMissingCandidates(sentences, evaluatedById);
  if (candidates.length === 0) return new Map();

  const items: MissingWordCheckInput[] = candidates.map((candidate) => ({
    id: candidate.id,
    source: candidate.source,
    reference: candidate.reference,
    userAnswer: candidate.userAnswer,
    word: candidate.word,
  }));

  try {
    const raw = await callAI([
      { role: "user", content: getMissingWordVerificationPrompt(items) },
    ]);
    const parsed = parseMissingVerification(raw);
    const verdicts = new Map(
      parsed.results.map((result) => [result.id, result])
    );
    const result = new Map<string, VocabularyIssue[]>();
    for (const candidate of candidates) {
      const verdict = verdicts.get(candidate.id);
      if (!verdict || verdict.conveyed || !verdict.confident) continue;
      const translation = cleanTranslation(verdict.translation ?? "");
      if (!translation) continue;
      // Only trust an "actual" word that the deterministic diff paired with
      // this reference word. Under "..." the model tends to reuse one nearby
      // word ("few") for every missing item.
      const actual = candidate.actual;
      const list = result.get(candidate.sentenceId) ?? [];
      list.push({
        word: candidate.word,
        translation,
        note: actual ? `неправильне слово: «${actual}»` : "пропущено",
      });
      result.set(candidate.sentenceId, list);
    }
    return result;
  } catch (error) {
    logEvaluationError("missing word suggestion failed", error);
    return new Map();
  }
}

// Last resort for answers that still have "..." gaps without any vocabulary
// entry from the evaluator: ask once which English words fill those gaps.
async function fillGapVocabulary(
  sentences: StoredSentence[],
  evaluatedById: Map<string, EvaluatedEntry>
): Promise<Map<string, VocabularyIssue[]>> {
  const candidates = collectGapCandidates(sentences, evaluatedById);
  if (candidates.length === 0) return new Map();

  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const items: GapFillInput[] = candidates.map((candidate) => ({
    id: candidate.id,
    source: candidate.source,
    reference: candidate.reference,
    userAnswer: candidate.userAnswer,
    missing: candidate.missing,
  }));

  const suggestions: {
    id: string;
    candidate: (typeof candidates)[number];
    word: string;
    translation: string;
  }[] = [];

  try {
    const raw = await callAI([
      { role: "user", content: getGapFillPrompt(items) },
    ]);
    const parsed = gapFillSchema.parse(
      stripNullValues(JSON.parse(extractJsonObject(raw))) as unknown
    );

    for (const entry of parsed.results) {
      const candidate = byId.get(entry.id);
      if (!candidate) continue;
      const sentence = sentences.find(
        (item) => item.id === candidate.sentenceId
      );
      if (!sentence) continue;

      const englishSide = normalizeText(
        sentence.direction === "uk_en" ? sentence.reference : sentence.source
      );
      const known = new Set(
        (evaluatedById.get(sentence.id)?.vocabularyIssues ?? []).map((issue) =>
          normalizeText(issue.word)
        )
      );
      const seen = new Set<string>();
      const missingSet = new Set(candidate.missing.map(normalizeText));
      for (const item of entry.words) {
        const sourceTokens = tokenize(item.source ?? "");
        // The model must map words the deterministic diff actually found
        // missing; otherwise it tends to invent "learn" for any gap. A phrase
        // such as "різні культури" is fine when every token is missing.
        if (
          sourceTokens.length === 0 ||
          !sourceTokens.every((token) => missingSet.has(token))
        ) {
          continue;
        }
        const word = item.word.trim();
        const key = normalizeText(word);
        if (!key || item.confident === false) continue;
        const tokens = tokenize(word);
        if (tokens.length === 0 || tokens.length > 3) continue;
        if (tokens.every((token) => STOPWORDS.has(token))) continue;
        if (!englishSide.includes(key) || seen.has(key) || known.has(key)) {
          continue;
        }
        const translation = cleanTranslation(item.translation ?? "");
        if (!translation || !hasCyrillic(translation)) continue;
        seen.add(key);
        suggestions.push({
          id: `${candidate.id}-${suggestions.length + 1}`,
          candidate,
          word,
          translation,
        });
      }
    }
  } catch (error) {
    logEvaluationError("gap fill failed", error);
    return new Map();
  }

  if (suggestions.length === 0) return new Map();

  // The diff may list words the student paraphrased rather than omitted. Ask
  // whether each suggested word is already conveyed somewhere in the answer;
  // only true gaps become cards.
  try {
    const checkItems: TranslationCheckInput[] = suggestions.map(
      (suggestion) => ({
        id: suggestion.id,
        source: suggestion.candidate.source,
        userAnswer: suggestion.candidate.userAnswer,
        word: suggestion.word,
        translation: suggestion.translation,
      })
    );
    const raw = await callAI([
      { role: "user", content: getTranslationVerificationPrompt(checkItems) },
    ]);
    const parsed = parseVerificationResponse(raw);
    const conveyed = new Set(
      parsed.results
        .filter((result) => result.acceptable)
        .map((result) => result.id)
    );

    const result = new Map<string, VocabularyIssue[]>();
    for (const suggestion of suggestions) {
      if (conveyed.has(suggestion.id)) continue;
      const list = result.get(suggestion.candidate.sentenceId) ?? [];
      if (list.length >= MAX_ISSUES_PER_SENTENCE) continue;
      if (
        list.some(
          (issue) =>
            normalizeText(issue.word) === normalizeText(suggestion.word)
        )
      ) {
        continue;
      }
      list.push({
        word: suggestion.word,
        translation: suggestion.translation,
        note: "пропущено",
      });
      result.set(suggestion.candidate.sentenceId, list);
    }
    return result;
  } catch (error) {
    logEvaluationError("gap fill verification failed", error);
    return new Map();
  }
}

async function fillUnfilledGapVocabulary(
  sentences: StoredSentence[],
  evaluatedById: Map<string, EvaluatedEntry>
): Promise<Map<string, VocabularyIssue[]>> {
  const candidates = collectUnfilledGapCandidates(sentences, evaluatedById);
  if (candidates.length === 0) return new Map();

  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const items: GapWordInput[] = candidates.map((candidate) => ({
    id: candidate.id,
    direction: candidate.direction,
    source: candidate.source,
    reference: candidate.reference,
    userAnswer: candidate.userAnswer,
    gaps: candidate.gaps,
  }));

  const suggestions: {
    id: string;
    candidate: (typeof candidates)[number];
    word: string;
    translation: string;
  }[] = [];

  try {
    const raw = await callAI([
      { role: "user", content: getGapWordPrompt(items) },
    ]);
    const parsed = gapWordSchema.parse(
      stripNullValues(JSON.parse(extractJsonObject(raw))) as unknown
    );

    for (const entry of parsed.results) {
      const candidate = byId.get(entry.id);
      if (!candidate) continue;
      const sentence = sentences.find(
        (item) => item.id === candidate.sentenceId
      );
      if (!sentence) continue;

      const englishSide = normalizeText(
        sentence.direction === "uk_en" ? sentence.reference : sentence.source
      );
      const answerTokens = new Set(tokenize(sentence.userAnswer ?? ""));
      const known = new Set(
        (evaluatedById.get(sentence.id)?.vocabularyIssues ?? []).map((issue) =>
          normalizeText(issue.word)
        )
      );
      const byIndex = new Map(
        entry.gaps.map((gap) => [gap.index, gap] as const)
      );

      for (let index = 1; index <= candidate.gaps; index += 1) {
        const gap = byIndex.get(index) ?? entry.gaps[index - 1];
        if (!gap || gap.confident === false) continue;
        // "you will" / "will read" → keep only content words: "read".
        const contentTokens = tokenize(gap.word).filter(
          (token) => !STOPWORDS.has(token)
        );
        if (contentTokens.length === 0 || contentTokens.length > 3) continue;
        const word = contentTokens.join(" ");
        const key = normalizeText(word);
        if (!key || !englishSide.includes(key) || known.has(key)) continue;
        if (contentTokens.length === 1 && answerTokens.has(contentTokens[0]!)) {
          continue;
        }
        const translation = cleanTranslation(gap.translation ?? "");
        if (!translation || !hasCyrillic(translation)) continue;
        suggestions.push({
          id: `${candidate.id}-${suggestions.length + 1}`,
          candidate,
          word,
          translation,
        });
      }
    }
  } catch (error) {
    logEvaluationError("gap word fallback failed", error);
    return new Map();
  }

  if (suggestions.length === 0) return new Map();

  // For uk_en the missing word is an English word the student did not write;
  // the translation check is designed for en_uk answers, so it would confuse
  // the Ukrainian source with the answer. Keep those suggestions as-is.
  const ukEnSuggestions = suggestions.filter(
    (suggestion) => suggestion.candidate.direction === "uk_en"
  );
  const enUkSuggestions = suggestions.filter(
    (suggestion) => suggestion.candidate.direction === "en_uk"
  );

  try {
    const conveyed = new Set<string>();
    if (enUkSuggestions.length > 0) {
      const checkItems: TranslationCheckInput[] = enUkSuggestions.map(
        (suggestion) => ({
          id: suggestion.id,
          source: suggestion.candidate.source,
          userAnswer: suggestion.candidate.userAnswer,
          word: suggestion.word,
          translation: suggestion.translation,
        })
      );
      const raw = await callAI([
        { role: "user", content: getTranslationVerificationPrompt(checkItems) },
      ]);
      const parsed = parseVerificationResponse(raw);
      for (const result of parsed.results) {
        if (result.acceptable) conveyed.add(result.id);
      }
    }

    const result = new Map<string, VocabularyIssue[]>();
    for (const suggestion of [...ukEnSuggestions, ...enUkSuggestions]) {
      if (conveyed.has(suggestion.id)) continue;
      const list = result.get(suggestion.candidate.sentenceId) ?? [];
      if (list.length >= MAX_ISSUES_PER_SENTENCE) continue;
      if (
        list.some(
          (issue) => normalizeText(issue.word) === normalizeText(suggestion.word)
        )
      ) {
        continue;
      }
      list.push({
        word: suggestion.word,
        translation: suggestion.translation,
        note: "пропущено",
      });
      result.set(suggestion.candidate.sentenceId, list);
    }
    return result;
  } catch (error) {
    logEvaluationError("gap word fallback verification failed", error);
    return new Map();
  }
}

function parseVerificationResponse(
  raw: string
): z.infer<typeof substitutionVerificationSchema> {
  return substitutionVerificationSchema.parse(
    stripNullValues(JSON.parse(extractJsonObject(raw)))
  );
}

function parseMissingVerification(
  raw: string
): z.infer<typeof missingWordVerificationSchema> {
  return missingWordVerificationSchema.parse(
    stripNullValues(JSON.parse(extractJsonObject(raw)))
  );
}

function extractJsonObject(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Substitution verification returned no JSON");
  }
  return raw.slice(start, end + 1);
}

function findViolations(
  sentences: StoredSentence[],
  evaluated: Map<string, EvaluatedEntry>
): string[] {
  const violations: string[] = [];
  for (const sentence of sentences) {
    const entry = evaluated.get(sentence.id);
    if (!entry) continue;
    const answer = normalizeForPrompt(sentence.userAnswer);
    const hasEllipsis = answer.includes("...");
    const needsWords = entry.skipped || hasEllipsis;

    if (!entry.structured) {
      violations.push(
        `sentence ${sentence.id}: use the structured fields "topic", "vocabularyIssues", "grammarIssues" and "spellingIssues" instead of a free-form explanation`
      );
    }
    if (needsWords && entry.vocabularyToAdd.length === 0) {
      violations.push(
        `sentence ${sentence.id}: "vocabularyIssues" must not be empty when the answer is "${answer}" — add 1-3 key English words with Ukrainian translations`
      );
    }
    const ellipsisCount = (answer.match(/\.\.\./g) ?? []).length;
    if (ellipsisCount > entry.vocabularyIssues.length) {
      violations.push(
        `sentence ${sentence.id}: the answer contains ${ellipsisCount} "..." but only ${entry.vocabularyIssues.length} vocabulary entries — every "..." must yield the missing English word or phrase with a Ukrainian translation`
      );
    }
    if (entry.grammarHasEllipsis) {
      violations.push(
        `sentence ${sentence.id}: "grammarIssues" must not contain a bare "..." — quote the student's fragment and spell out the corrected words`
      );
    }
    if (entry.vocabularyIssues.length > MAX_ISSUES_PER_SENTENCE) {
      violations.push(
        `sentence ${sentence.id}: "vocabularyIssues" has ${entry.vocabularyIssues.length} words — keep only 1-4 key content words, never the whole sentence word by word`
      );
    }
    const answerText = normalizeText(answer);
    for (const issue of entry.spellingIssues) {
      if (issue.wrong.toLowerCase() === issue.correct.toLowerCase()) {
        violations.push(
          `sentence ${sentence.id}: spelling issue quotes the same word twice ("${issue.wrong}") — "wrong" must be the student's misspelled form and "correct" the right one, they must differ`
        );
      } else if (!answerText.includes(normalizeText(issue.wrong))) {
        violations.push(
          `sentence ${sentence.id}: spelling issue "${issue.wrong}" does not appear in the student's answer — copy the misspelled form exactly from "userAnswer"`
        );
      }
    }
    if (!entry.topicMastered && !entry.topicNote) {
      violations.push(
        `sentence ${sentence.id}: "topic".mastered is false but "note" is empty — explain in Ukrainian what is wrong with the topic`
      );
    }
    if (entry.topicNote && !hasCyrillic(entry.topicNote)) {
      violations.push(
        `sentence ${sentence.id}: "topic".note must be in Ukrainian`
      );
    }
    for (const issue of entry.grammarIssues) {
      if (!hasCyrillic(issue)) {
        violations.push(
          `sentence ${sentence.id}: "grammarIssues" must be in Ukrainian`
        );
      }
    }
    for (const issue of entry.vocabularyIssues) {
      if (!issue.translation) {
        violations.push(
          `sentence ${sentence.id}: correction "${issue.word}" has no "meaning" — add its Ukrainian translation`
        );
      } else if (!hasCyrillic(issue.translation)) {
        violations.push(
          `sentence ${sentence.id}: "meaning" for "${issue.word}" must be in Ukrainian`
        );
      }
    }
  }
  return violations;
}

function hasCyrillic(text: string): boolean {
  return /[а-яїієґ]/i.test(text);
}

const META_TRANSLATION_RE = /^(неправильн|пропущен|wrong|missing)/i;

// The model sometimes puts a status label instead of the meaning.
function cleanTranslation(value: string | undefined): string {
  const translation = (value ?? "").trim();
  return META_TRANSLATION_RE.test(translation) ? "" : translation;
}

// Spelling corrections belong to the "Правопис" line only — never repeat them
// inside the topic note.
function stripSpellingFromNote(
  note: string,
  spellingIssues: SpellingIssue[]
): string {
  let result = note;
  for (const issue of spellingIssues) {
    const pairs = [
      `«${issue.wrong}» → «${issue.correct}»`,
      `'${issue.wrong}' → '${issue.correct}'`,
      `"${issue.wrong}" → "${issue.correct}"`,
    ];
    for (const pair of pairs) {
      result = result.split(pair).join("");
    }
  }
  return result
    .replace(/\s{2,}/g, " ")
    .replace(/[\s,;:–-]+$/g, "")
    .trim();
}

function logEvaluationError(stage: string, error: unknown): void {
  logAIRequest({
    provider: "evaluate-answers",
    model: stage,
    promptLength: 0,
    responseLength: 0,
    latencyMs: 0,
    error: error instanceof Error ? error.message : String(error),
  });
}
