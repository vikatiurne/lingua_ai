import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import type { Exercise, ExerciseSentence } from "@lingua/shared";
import { generateExercisePdf } from "./generator";

function buildExercise(sentences: ExerciseSentence[]): Exercise {
  return {
    id: "test-exercise",
    userId: "user-1",
    level: "B1",
    topic: "Modal Verbs",
    subtopic: "Obligation",
    templateIds: ["modal-verbs-obligation-1"],
    sentences,
    status: "generated",
    createdAt: new Date().toISOString(),
  };
}

describe("generateExercisePdf", () => {
  it("generates valid PDF with Cyrillic and both sections", async () => {
    const exercise = buildExercise([
      {
        id: "1",
        source: "Я повинен закінчити роботу сьогодні.",
        direction: "uk-en",
        reference: "I must finish the work today.",
      },
      {
        id: "2",
        source: "She has to wake up early every morning to catch the train to work.",
        direction: "en-uk",
        reference: "Вона мусить прокидатись рано.",
      },
    ]);

    const bytes = await generateExercisePdf(exercise);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");

    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it("adds pages automatically for many sentences", async () => {
    const sentences: ExerciseSentence[] = Array.from({ length: 40 }, (_, i) => ({
      id: String(i),
      source: `Це дуже довге речення номер ${i} для перевірки переносу тексту та автоматичного додавання сторінок у PDF документі.`,
      direction: i % 2 === 0 ? "uk-en" : "en-uk",
      reference: "ref",
    }));

    const bytes = await generateExercisePdf(buildExercise(sentences));
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);
  });
});
