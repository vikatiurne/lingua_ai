import { describe, expect, it } from "vitest";
import {
  buildTopicNote,
  classifyCorrections,
  dedupeCorrections,
  isTopicDuplicate,
} from "./corrections";

describe("classifyCorrections", () => {
  it("classifies a missing content word as vocabulary", () => {
    const result = classifyCorrections(
      [{ wrong: "", correct: "painting", meaning: "малювання" }],
      "uk_en"
    );
    expect(result.vocabulary).toEqual([
      { word: "painting", translation: "малювання", note: "пропущено" },
    ]);
  });

  it('treats "..." in the wrong field as a missing word', () => {
    const result = classifyCorrections(
      [{ wrong: "...", correct: "environment", meaning: "середовище" }],
      "uk_en"
    );
    expect(result.vocabulary).toEqual([
      { word: "environment", translation: "середовище", note: "пропущено" },
    ]);
  });

  it("keeps only the tokens that are actually absent from the answer", () => {
    const result = classifyCorrections(
      [{ wrong: "", correct: "in her free time", meaning: "у вільний час" }],
      "uk_en",
      "she love ... ... in free time"
    );
    expect(result.grammar).toEqual(["пропущено «her»"]);
    expect(result.vocabulary).toEqual([]);
  });

  it("drops a missing word that is already in the answer", () => {
    const result = classifyCorrections(
      [{ wrong: "", correct: "than" }],
      "uk_en",
      "this is better than that"
    );
    expect(result.grammar).toEqual([]);
    expect(result.vocabulary).toEqual([]);
  });

  it("classifies a missing function word as grammar", () => {
    const result = classifyCorrections(
      [{ wrong: "", correct: "to" }],
      "uk_en"
    );
    expect(result.grammar).toEqual(["пропущено «to»"]);
    expect(result.vocabulary).toEqual([]);
  });

  it("classifies a changed function word as grammar", () => {
    const result = classifyCorrections(
      [{ wrong: "at the park", correct: "in the park" }],
      "uk_en"
    );
    expect(result.grammar).toEqual(["«at the park» → «in the park»"]);
  });

  it("classifies a missing function word inside a phrase as grammar", () => {
    const result = classifyCorrections(
      [{ wrong: "in free time", correct: "in her free time" }],
      "uk_en"
    );
    expect(result.grammar).toEqual(["«in free time» → «in her free time»"]);
    expect(result.vocabulary).toEqual([]);
  });

  it("classifies a verb form change as grammar", () => {
    const result = classifyCorrections(
      [{ wrong: "walk", correct: "walking" }],
      "uk_en"
    );
    expect(result.grammar).toEqual(["«walk» → «walking»"]);
  });

  it("classifies a wrong content word as vocabulary with the actual word", () => {
    const result = classifyCorrections(
      [{ wrong: "few", correct: "less", meaning: "менш" }],
      "uk_en"
    );
    expect(result.vocabulary).toEqual([
      {
        word: "less",
        translation: "менш",
        note: "неправильне слово: «few»",
        actual: "few",
      },
    ]);
  });

  it("classifies a typo as spelling", () => {
    const result = classifyCorrections(
      [{ wrong: "comfortabl", correct: "comfortable", meaning: "зручний" }],
      "uk_en"
    );
    expect(result.spelling).toEqual([
      { wrong: "comfortabl", correct: "comfortable", translation: "зручний" },
    ]);
  });

  it("treats every en_uk correction as vocabulary", () => {
    const result = classifyCorrections(
      [{ wrong: "вдячні", correct: "appreciate", meaning: "цінуємо" }],
      "en_uk"
    );
    expect(result.vocabulary).toEqual([
      {
        word: "appreciate",
        translation: "цінуємо",
        note: "неправильне слово: «вдячні»",
        actual: "вдячні",
      },
    ]);
    expect(result.grammar).toEqual([]);
    expect(result.spelling).toEqual([]);
  });
});

describe("dedupeCorrections", () => {
  it("drops a short correction contained in a larger one", () => {
    const result = dedupeCorrections([
      { wrong: "", correct: "to" },
      { wrong: "listening music", correct: "listening to music" },
    ]);
    expect(result).toEqual([
      { wrong: "listening music", correct: "listening to music" },
    ]);
  });

  it("drops exact duplicates", () => {
    const result = dedupeCorrections([
      { wrong: "few", correct: "less" },
      { wrong: "few", correct: "less" },
    ]);
    expect(result).toHaveLength(1);
  });
});

describe("isTopicDuplicate", () => {
  it("matches the same fragment", () => {
    expect(
      isTopicDuplicate(
        { wrong: "the most", correct: "the more" },
        { wrong: "the most", correct: "the more" }
      )
    ).toBe(true);
  });

  it("matches a larger correction containing the violation", () => {
    expect(
      isTopicDuplicate(
        { wrong: "walk at the park", correct: "walking in the park" },
        { wrong: "walk", correct: "walking" }
      )
    ).toBe(true);
  });

  it("does not match unrelated corrections", () => {
    expect(
      isTopicDuplicate(
        { wrong: "at the park", correct: "in the park" },
        { wrong: "walk", correct: "walking" }
      )
    ).toBe(false);
  });
});

describe("buildTopicNote", () => {
  it("shows the wrong and correct forms", () => {
    expect(buildTopicNote({ wrong: "walk", correct: "walking" })).toBe(
      "неправильна форма: використано «walk» замість «walking»"
    );
  });

  it("falls back when the violation is missing", () => {
    expect(buildTopicNote(undefined)).toBe("є помилки за темою");
  });
});
