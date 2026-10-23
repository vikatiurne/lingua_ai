import { describe, expect, it } from "vitest";
import {
  collectGapCandidates,
  collectMissingCandidates,
  collectSubstitutionCandidates,
  collectTranslationCandidates,
  collectUnfilledGapCandidates,
  MAX_SUBSTITUTION_CANDIDATES,
  substitutionKey,
  translationKey,
} from "./substitution-check";

type Sentence = Parameters<typeof collectSubstitutionCandidates>[0][number];
type Evaluation = Parameters<typeof collectSubstitutionCandidates>[1] extends Map<
  string,
  infer T
>
  ? T
  : never;

function sentence(overrides: Partial<Sentence> = {}): Sentence {
  return {
    id: "s1",
    direction: "uk_en",
    source: "Він пішов додому.",
    reference: "He went home.",
    userAnswer: "He returned home.",
    ...overrides,
  };
}

function evaluation(
  vocabularyIssues: Evaluation["vocabularyIssues"] = [
    { word: "went", translation: "пішов" },
  ],
  overrides: Partial<Evaluation> = {}
): Evaluation {
  return {
    isCorrect: false,
    skipped: false,
    topicMastered: true,
    vocabularyIssues,
    ...overrides,
  };
}

function mapFor(sentenceId: string, value: Evaluation): Map<string, Evaluation> {
  return new Map([[sentenceId, value]]);
}

describe("substitutionKey", () => {
  it("normalizes case and punctuation", () => {
    expect(substitutionKey("s1", "Went", "returned.")).toBe(
      substitutionKey("s1", "went", "returned")
    );
  });
});

describe("collectSubstitutionCandidates", () => {
  it("collects a flagged word replaced by another word", () => {
    const candidates = collectSubstitutionCandidates(
      [sentence()],
      mapFor("s1", evaluation())
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      id: "1",
      sentenceId: "s1",
      expected: "went",
      actual: "returned",
    });
  });

  it("ignores words that are simply missing", () => {
    const candidates = collectSubstitutionCandidates(
      [sentence({ userAnswer: "He home." })],
      mapFor("s1", evaluation())
    );
    expect(candidates).toEqual([]);
  });

  it("ignores words that are actually present in the answer", () => {
    const candidates = collectSubstitutionCandidates(
      [sentence({ userAnswer: "He went home." })],
      mapFor("s1", evaluation())
    );
    expect(candidates).toEqual([]);
  });

  it("ignores en_uk sentences", () => {
    const candidates = collectSubstitutionCandidates(
      [sentence({ direction: "en_uk" })],
      mapFor("s1", evaluation())
    );
    expect(candidates).toEqual([]);
  });

  it("ignores skipped sentences and evaluations without issues", () => {
    expect(
      collectSubstitutionCandidates(
        [sentence()],
        mapFor("s1", evaluation([{ word: "went", translation: "пішов" }], { skipped: true }))
      )
    ).toEqual([]);
    expect(
      collectSubstitutionCandidates(
        [sentence()],
        mapFor("s1", evaluation([]))
      )
    ).toEqual([]);
  });

  it("limits the number of candidates", () => {
    const sentences = Array.from({ length: MAX_SUBSTITUTION_CANDIDATES + 5 }, (_, index) =>
      sentence({ id: `s${index}`, userAnswer: "He returned home." })
    );
    const evaluations = new Map(
      sentences.map((item) => [item.id, evaluation()])
    );
    const candidates = collectSubstitutionCandidates(sentences, evaluations);
    expect(candidates).toHaveLength(MAX_SUBSTITUTION_CANDIDATES);
  });
});

describe("collectTranslationCandidates", () => {
  const enUk = sentence({
    id: "e1",
    direction: "en_uk",
    source: "The more we learn, the more we appreciate diversity.",
    reference: "Чим більше ми дізнаємося, тим більше ми цінуємо різноманітність.",
    userAnswer: "чим більше ми вчимо, тим більше ми благодарні",
  });

  it("collects flagged words for en_uk sentences", () => {
    const candidates = collectTranslationCandidates(
      [enUk],
      mapFor(
        "e1",
        evaluation([
          { word: "learn", translation: "дізнаємося" },
          { word: "appreciate", translation: "цінуємо" },
        ])
      )
    );
    expect(candidates.map((candidate) => candidate.word)).toEqual([
      "learn",
      "appreciate",
    ]);
    expect(candidates[0]?.translation).toBe("дізнаємося");
  });

  it("ignores uk_en sentences", () => {
    const candidates = collectTranslationCandidates(
      [sentence()],
      mapFor("s1", evaluation())
    );
    expect(candidates).toEqual([]);
  });

  it("ignores skipped sentences", () => {
    const candidates = collectTranslationCandidates(
      [enUk],
      mapFor("e1", evaluation([], { skipped: true }))
    );
    expect(candidates).toEqual([]);
  });

  it("builds a stable key", () => {
    expect(translationKey("e1", "Learn")).toBe("e1|learn");
  });
});

describe("collectMissingCandidates", () => {
  it("collects content words missing from the answer and skips stopwords", () => {
    const candidates = collectMissingCandidates(
      [
        sentence({
          reference: "This option is less convenient than the previous one.",
          userAnswer: "This option is few convenient than the previous one.",
        }),
      ],
      mapFor("s1", evaluation([{ word: "convenient", translation: "зручний" }]))
    );
    expect(candidates.map((candidate) => candidate.word)).toEqual(["less"]);
    expect(candidates[0]?.actual).toBe("few");
  });

  it("does not suggest words already reported by the model", () => {
    const candidates = collectMissingCandidates(
      [sentence({ userAnswer: "He home." })],
      mapFor("s1", evaluation([{ word: "went", translation: "пішов" }]))
    );
    expect(candidates).toEqual([]);
  });

  it("skips correct and skipped sentences", () => {
    expect(
      collectMissingCandidates(
        [sentence()],
        mapFor("s1", evaluation([], { isCorrect: true }))
      )
    ).toEqual([]);
    expect(
      collectMissingCandidates(
        [sentence()],
        mapFor("s1", evaluation([], { skipped: true }))
      )
    ).toEqual([]);
  });

  it("skips sentences with an unmastered topic", () => {
    const candidates = collectMissingCandidates(
      [
        sentence({
          reference: "The more you read, the more you understand.",
          userAnswer: "the most you read, the more you know",
        }),
      ],
      mapFor("s1", evaluation([], { topicMastered: false }))
    );
    expect(candidates).toEqual([]);
  });

  it("suggests a missing word when an explicit gap has no card", () => {
    const candidates = collectMissingCandidates(
      [
        sentence({
          reference:
            "She is trying to improve her speaking skills in English.",
          userAnswer: "she is trying to improove her speaking ... in Engish",
        }),
      ],
      mapFor("s1", evaluation([], { topicMastered: false }))
    );
    expect(candidates.map((candidate) => candidate.word)).toEqual(["skills"]);
  });

  it("ignores en_uk sentences", () => {
    const candidates = collectMissingCandidates(
      [
        sentence({
          direction: "en_uk",
          source: "He went home.",
          reference: "Він пішов додому.",
          userAnswer: "Він додому.",
        }),
      ],
      mapFor("s1", evaluation([]))
    );
    expect(candidates).toEqual([]);
  });
});

describe("collectGapCandidates", () => {
  it("collects en_uk answers with unfilled gaps and no vocabulary issues", () => {
    const candidates = collectGapCandidates(
      [
        sentence({
          direction: "en_uk",
          source: "I prefer studying in a quiet environment.",
          reference: "Я надаю перевагу навчанню в тихому середовищі.",
          userAnswer: "я надаю перевагу навчанню у тихій ...",
        }),
      ],
      mapFor("s1", evaluation([]))
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.sentenceId).toBe("s1");
  });

  it("collects when some gaps still have no vocabulary card", () => {
    const candidates = collectGapCandidates(
      [
        sentence({
          direction: "en_uk",
          source: "She enjoys painting landscapes.",
          reference: "Вона насолоджується малюванням пейзажів.",
          userAnswer: "вона ... ... пейзажів",
        }),
      ],
      mapFor("s1", evaluation())
    );
    expect(candidates).toHaveLength(1);
  });

  it("still collects when the existing card may not cover the gap", () => {
    const candidates = collectGapCandidates(
      [
        sentence({
          direction: "en_uk",
          source: "She enjoys painting landscapes.",
          reference: "Вона насолоджується малюванням пейзажів.",
          userAnswer: "вона ...",
        }),
      ],
      mapFor("s1", evaluation())
    );
    expect(candidates).toHaveLength(1);
  });

  it("ignores uk_en answers (missing candidates cover them)", () => {
    const candidates = collectGapCandidates(
      [sentence({ userAnswer: "she love ... ... in free time" })],
      mapFor("s1", evaluation([]))
    );
    expect(candidates).toEqual([]);
  });

  it("skips answers without gaps", () => {
    const candidates = collectGapCandidates(
      [sentence({ userAnswer: "He went home." })],
      mapFor("s1", evaluation([]))
    );
    expect(candidates).toEqual([]);
  });
});

describe("collectUnfilledGapCandidates", () => {
  it("collects a uk_en gap without any vocabulary card", () => {
    const candidates = collectUnfilledGapCandidates(
      [
        sentence({
          userAnswer: "if i have ... i would go",
        }),
      ],
      mapFor("s1", evaluation([]))
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      sentenceId: "s1",
      direction: "uk_en",
      gaps: 1,
    });
  });

  it("collects an en_uk gap without any vocabulary card", () => {
    const candidates = collectUnfilledGapCandidates(
      [
        sentence({
          direction: "en_uk",
          source: "She enjoys painting landscapes.",
          reference: "Вона насолоджується малюванням пейзажів.",
          userAnswer: "вона ...",
        }),
      ],
      mapFor("s1", evaluation([]))
    );
    expect(candidates).toHaveLength(1);
  });

  it("skips a gap that already has a missing-word card", () => {
    const candidates = collectUnfilledGapCandidates(
      [
        sentence({
          userAnswer: "if i have ... i would go",
        }),
      ],
      mapFor(
        "s1",
        evaluation([{ word: "promotion", translation: "підвищення", note: "пропущено" }])
      )
    );
    expect(candidates).toEqual([]);
  });
});
