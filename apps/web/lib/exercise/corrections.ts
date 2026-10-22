import { isTypo, tokenize } from "./diff";
import { STOPWORDS } from "./words";

// The model only reports raw corrections (wrong fragment → correct fragment).
// All categories are decided here, deterministically, so the same mistake
// always lands in the same section of the review.
export type RawCorrection = {
  wrong?: string;
  correct?: string;
  meaning?: string;
  note?: string;
};

export type CorrectionViolation = {
  wrong?: string;
  correct?: string;
};

export type ClassifiedCorrections = {
  vocabulary: {
    word: string;
    translation: string;
    note: string;
    actual?: string;
  }[];
  grammar: string[];
  spelling: { wrong: string; correct: string; translation: string }[];
};

const SUFFIXES = ["ing", "ed", "es", "s", "er", "est", "ly"];

function stem(word: string): string {
  let stemmed = word;
  for (const suffix of SUFFIXES) {
    if (stemmed.endsWith(suffix) && stemmed.length - suffix.length >= 3) {
      stemmed = stemmed.slice(0, -suffix.length);
      break;
    }
  }
  // studies → study, stopped → stop
  stemmed = stemmed.replace(/i$/, "y");
  stemmed = stemmed.replace(/([b-df-hj-np-tv-z])\1$/, "$1");
  return stemmed;
}

function sameStem(a: string, b: string): boolean {
  return a === b || stem(a) === stem(b);
}

function multisetDifference(
  from: string[],
  remove: string[]
): string[] {
  const counts = new Map<string, number>();
  for (const token of from) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  for (const token of remove) {
    const count = counts.get(token) ?? 0;
    if (count > 0) counts.set(token, count - 1);
  }
  const result: string[] = [];
  for (const [token, count] of counts) {
    for (let index = 0; index < count; index += 1) result.push(token);
  }
  return result;
}

function isGrammarChange(wrong: string, correct: string): boolean {
  const wrongTokens = tokenize(wrong);
  const correctTokens = tokenize(correct);
  const removed = multisetDifference(wrongTokens, correctTokens);
  const added = multisetDifference(correctTokens, wrongTokens);
  if (removed.length === 0 && added.length === 0) return true;
  // Adding or removing only function words is grammar.
  if (
    removed.every((token) => STOPWORDS.has(token)) &&
    added.every((token) => STOPWORDS.has(token))
  ) {
    return true;
  }
  // Same content word in another form (love → loves, walk → walking) is
  // grammar. Match removed and added words by stem, not by position.
  const removedContent = removed.filter((token) => !STOPWORDS.has(token));
  const addedContent = added.filter((token) => !STOPWORDS.has(token));
  if (
    removedContent.length === 0 ||
    removedContent.length !== addedContent.length
  ) {
    return false;
  }
  const unmatched = [...addedContent];
  for (const word of removedContent) {
    const index = unmatched.findIndex((candidate) => sameStem(word, candidate));
    if (index === -1) return false;
    unmatched.splice(index, 1);
  }
  return true;
}

function normalizeTokens(value: string | undefined): string[] {
  return tokenize(value ?? "");
}

function isSubsumed(shorter: RawCorrection, longer: RawCorrection): boolean {
  const shortWrong = normalizeTokens(shorter.wrong);
  const shortCorrect = normalizeTokens(shorter.correct);
  const longWrong = normalizeTokens(longer.wrong);
  const longCorrect = normalizeTokens(longer.correct);
  if (shortCorrect.length === 0 || longCorrect.length === 0) return false;
  if (shortCorrect.length >= longCorrect.length) return false;
  const correctIncluded = shortCorrect.every((token) =>
    longCorrect.includes(token)
  );
  if (!correctIncluded) return false;
  if (shortWrong.length === 0) return true;
  return shortWrong.every((token) => longWrong.includes(token));
}

export function dedupeCorrections(
  corrections: RawCorrection[]
): RawCorrection[] {
  const unique: RawCorrection[] = [];
  const seen = new Set<string>();
  for (const correction of corrections) {
    const key = `${normalizeTokens(correction.wrong).join(" ")}|${normalizeTokens(
      correction.correct
    ).join(" ")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(correction);
  }
  return unique.filter(
    (correction) =>
      !unique.some(
        (other) => other !== correction && isSubsumed(correction, other)
      )
  );
}

export function classifyCorrections(
  corrections: RawCorrection[],
  direction: "uk_en" | "en_uk",
  answer = ""
): ClassifiedCorrections {
  const result: ClassifiedCorrections = {
    vocabulary: [],
    grammar: [],
    spelling: [],
  };

  const answerTokens = new Set(tokenize(answer));

  for (const correction of dedupeCorrections(corrections)) {
    const rawWrong = (correction.wrong ?? "").trim();
    // "..." in the wrong field means the word was omitted, not written.
    const wrong = /^[\s.…]*$/.test(rawWrong) ? "" : rawWrong;
    const correct = (correction.correct ?? "").trim();
    const meaning = (correction.meaning ?? "").trim();
    if (!correct) continue;

    if (direction === "en_uk") {
      // Only meaning mistakes exist for this direction; Ukrainian grammar and
      // spelling are never graded.
      result.vocabulary.push({
        word: correct,
        translation: meaning,
        note: wrong ? `неправильне слово: «${wrong}»` : "пропущено",
        ...(wrong ? { actual: wrong } : {}),
      });
      continue;
    }

    if (!wrong) {
      const tokens = tokenize(correct);
      const missing = tokens.filter((token) => !answerTokens.has(token));
      if (missing.length === 0) continue;
      const missingContent = missing.filter((token) => !STOPWORDS.has(token));
      if (missingContent.length === 0) {
        result.grammar.push(`пропущено «${missing.join(" ")}»`);
      } else {
        result.vocabulary.push({
          word: missingContent.join(" "),
          translation: meaning,
          note: "пропущено",
        });
      }
      continue;
    }

    if (isTypo(wrong, correct)) {
      result.spelling.push({ wrong, correct, translation: meaning });
      continue;
    }

    if (isGrammarChange(wrong, correct)) {
      result.grammar.push(`«${wrong}» → «${correct}»`);
      continue;
    }

    result.vocabulary.push({
      word: correct,
      translation: meaning,
      note: `неправильне слово: «${wrong}»`,
      actual: wrong,
    });
  }

  return result;
}

function normalizeFragment(value: string | undefined): string {
  return tokenize(value ?? "").join(" ");
}

// A correction that describes the same fragment as the topic violation must
// not be repeated in the grammar/vocabulary sections.
export function isTopicDuplicate(
  correction: RawCorrection,
  violation: CorrectionViolation | undefined
): boolean {
  if (!violation) return false;
  const correctionWrong = normalizeFragment(correction.wrong);
  const correctionCorrect = normalizeFragment(correction.correct);
  const violationWrong = normalizeFragment(violation.wrong);
  const violationCorrect = normalizeFragment(violation.correct);
  if (!violationCorrect) return false;
  if (correctionWrong === violationWrong && correctionCorrect === violationCorrect) {
    return true;
  }
  const wrongMatches =
    violationWrong === "" ||
    (correctionWrong !== "" && correctionWrong.includes(violationWrong));
  const correctMatches =
    correctionCorrect === violationCorrect ||
    correctionCorrect.includes(violationCorrect);
  return wrongMatches && correctMatches;
}

export function buildTopicNote(violation: CorrectionViolation | undefined): string {
  if (!violation || !violation.correct) return "є помилки за темою";
  const rawWrong = (violation.wrong ?? "").trim();
  const wrong = /^[\s.…]*$/.test(rawWrong) ? "" : rawWrong;
  const correct = violation.correct.trim();
  return wrong
    ? `неправильна форма: використано «${wrong}» замість «${correct}»`
    : `пропущено: «${correct}»`;
}
