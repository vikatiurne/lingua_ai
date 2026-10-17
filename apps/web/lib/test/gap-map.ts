import type { CEFRLevel } from "@lingua/shared";
import type { TestQuestion } from "./loader";

export type WeakTopic = {
  topic: string;
  level: CEFRLevel;
  errors: number;
  skippedCount: number;
};

export type TestAnswer = {
  questionId: string;
  correct: boolean;
  skipped: boolean;
};

export function analyzeGaps(
  answers: TestAnswer[],
  questions: TestQuestion[],
): WeakTopic[] {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const byTopic = new Map<string, WeakTopic>();

  for (const answer of answers) {
    if (answer.correct) continue;

    const question = questionById.get(answer.questionId);
    if (!question) continue;

    const existing = byTopic.get(question.topic);
    if (existing) {
      existing.errors += 1;
      existing.skippedCount += answer.skipped ? 1 : 0;
      continue;
    }

    byTopic.set(question.topic, {
      topic: question.topic,
      level: question.level,
      errors: 1,
      skippedCount: answer.skipped ? 1 : 0,
    });
  }

  return [...byTopic.values()].sort((a, b) => b.errors - a.errors);
}

export async function persistGaps(userId: string, gaps: WeakTopic[]): Promise<void> {
  if (gaps.length === 0) return;

  const { prisma } = await import("../db/client");

  await Promise.all(
    gaps.map((gap) =>
      prisma.topicProgress.upsert({
        where: {
          userId_level_topicName: {
            userId,
            level: gap.level,
            topicName: gap.topic,
          },
        },
        create: {
          userId,
          level: gap.level,
          topicName: gap.topic,
          status: "not_started",
        },
        // Never touch existing progress for a topic the user already started.
        update: {},
      }),
    ),
  );
}
