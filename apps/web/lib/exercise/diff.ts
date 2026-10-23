// Deterministic comparison of a student's answer with the reference
// translation. Used to cross-check the AI verdict (uk_en only): drop
// vocabulary entries for words the student actually wrote and reclassify
// misspelled words as spelling issues.

const MAX_PHRASE_WORDS = 3;
const TYPO_MIN_LENGTH = 5;

export type AnswerDiff = {
  missing: string[];
  missingPhrases: string[];
  extra: string[];
  substitutions: { expected: string; actual: string }[];
  typoPairs: { wrong: string; correct: string }[];
  onlyOrderChanged: boolean;
};

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}']+/gu) ?? []).filter(Boolean);
}

export function diffAnswer(
  reference: string,
  answer: string,
  options: { pairEllipsisGaps?: boolean } = {}
): AnswerDiff {
  const refTokens = tokenize(reference);
  const answerTokens = tokenize(answer);
  // An explicit "..." gap breaks positional alignment: the answer's remaining
  // words cannot be reliably paired with the reference gap. Treat them as
  // missing/extra instead of inventing false substitutions. en_uk can opt in
  // to pairing because the diff runs between two Ukrainian sentences.
  const hasEllipsis = /\.{3,}|\u2026/.test(answer);

  const lcs = buildLcsTable(refTokens, answerTokens);

  const missing: string[] = [];
  const missingPhrases: string[] = [];
  const extra: string[] = [];
  const substitutions: { expected: string; actual: string }[] = [];
  const typoPairs: { wrong: string; correct: string }[] = [];

  let i = 0;
  let j = 0;
  let refGap: string[] = [];
  let answerGap: string[] = [];

  const flushGap = () => {
    // Paired substitutions across "..." are only trustworthy for a clean
    // one-for-one swap. Multi-word gaps shift the remaining words, so pairing
    // them produces nonsense alignments.
    const canPair =
      !hasEllipsis ||
      (options.pairEllipsisGaps &&
        refGap.length === 1 &&
        answerGap.length === 1);
    const paired = canPair ? Math.min(refGap.length, answerGap.length) : 0;
    const gapMissing: string[] = [];
    for (let k = 0; k < paired; k += 1) {
      const expected = refGap[k]!;
      const actual = answerGap[k]!;
      if (isTypo(expected, actual)) {
        typoPairs.push({ wrong: actual, correct: expected });
      } else {
        gapMissing.push(expected);
        extra.push(actual);
        substitutions.push({ expected, actual });
      }
    }
    for (let k = paired; k < refGap.length; k += 1) {
      gapMissing.push(refGap[k]!);
    }
    for (let k = paired; k < answerGap.length; k += 1) {
      extra.push(answerGap[k]!);
    }
    missing.push(...gapMissing);
    missingPhrases.push(...buildPhrases(gapMissing));
    refGap = [];
    answerGap = [];
  };

  while (i < refTokens.length && j < answerTokens.length) {
    if (refTokens[i] === answerTokens[j]) {
      flushGap();
      i += 1;
      j += 1;
      continue;
    }
    if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      refGap.push(refTokens[i]!);
      i += 1;
    } else {
      answerGap.push(answerTokens[j]!);
      j += 1;
    }
  }
  while (i < refTokens.length) {
    refGap.push(refTokens[i]!);
    i += 1;
  }
  while (j < answerTokens.length) {
    answerGap.push(answerTokens[j]!);
    j += 1;
  }
  flushGap();

  // Pairing is disabled across "..." (see above), so a misspelled word next to
  // a gap would stay in "missing" and be reported as a word the student never
  // wrote. Rescue fuzzy-equal leftovers into typo pairs instead.
  if (hasEllipsis) {
    for (let m = missing.length - 1; m >= 0; m -= 1) {
      const expected = missing[m]!;
      const typoIndex = extra.findIndex((actual) => isTypo(expected, actual));
      if (typoIndex === -1) continue;
      typoPairs.push({ wrong: extra[typoIndex]!, correct: expected });
      missing.splice(m, 1);
      extra.splice(typoIndex, 1);
    }
    const remaining = new Set(missing);
    const keptPhrases = missingPhrases.filter((phrase) =>
      tokenize(phrase).every((token) => remaining.has(token))
    );
    missingPhrases.length = 0;
    missingPhrases.push(...keptPhrases);
  }

  const onlyOrderChanged =
    !sameTokens(refTokens, answerTokens) &&
    sameMultiset(refTokens, answerTokens);

  return {
    missing,
    missingPhrases,
    extra,
    substitutions,
    typoPairs,
    onlyOrderChanged,
  };
}

function buildLcsTable(a: string[], b: string[]): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i]![j] =
        a[i] === b[j]
          ? 1 + table[i + 1]![j + 1]!
          : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  return table;
}

export function isTypo(expected: string, actual: string): boolean {
  if (expected === actual) return true;
  if (expected.length < TYPO_MIN_LENGTH || actual.length < TYPO_MIN_LENGTH) {
    return false;
  }
  return levenshtein(expected, actual) === 1;
}

function levenshtein(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j]! + 1,
        current[j - 1]! + 1,
        previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j]!;
  }
  return previous[b.length]!;
}

// Phrases are built per alignment gap: consecutive missing words up to 3.
function buildPhrases(words: string[]): string[] {
  const phrases: string[] = [];
  for (let index = 0; index < words.length; index += 1) {
    const chunk: string[] = [];
    while (
      chunk.length < MAX_PHRASE_WORDS &&
      index + chunk.length < words.length
    ) {
      chunk.push(words[index + chunk.length]!);
    }
    phrases.push(chunk.join(" "));
    index += chunk.length - 1;
  }
  return phrases;
}

function sameTokens(a: string[], b: string[]): boolean {
  return (
    a.length === b.length && a.every((token, index) => token === b[index])
  );
}

function sameMultiset(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((token, index) => token === sortedB[index]);
}
