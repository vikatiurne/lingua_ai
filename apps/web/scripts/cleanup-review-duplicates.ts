/**
 * One-off cleanup for the "Work on mistakes" duplicate bug (task 34.1).
 *
 * Before the fix every click on "Work on mistakes" created a new exercise, so
 * a single topic could end up with dozens of review copies in the history.
 * This script keeps only the newest review exercise per topic and deletes the
 * older ones.
 *
 * A review exercise is recognised by its content: it holds exactly the
 * sentences that its source exercise marked as incorrect.
 *
 * Usage:
 *   pnpm cleanup:reviews            # dry run, prints the plan
 *   pnpm cleanup:reviews --apply    # deletes the duplicates
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type StoredSentence = {
  source?: string;
  direction?: string;
  reference?: string;
  isCorrect?: boolean;
};

type ExerciseRow = {
  id: string;
  userId: string;
  level: string;
  topicName: string;
  subtopicName: string | null;
  status: string;
  isReview: boolean;
  createdAt: Date;
  sentences: unknown;
};

function toSentences(value: unknown): StoredSentence[] {
  return Array.isArray(value) ? (value as StoredSentence[]) : [];
}

function sentenceKey(sentence: StoredSentence): string {
  return [sentence.source, sentence.direction, sentence.reference].join("\u0000");
}

function sentenceKeys(sentences: StoredSentence[]): Set<string> {
  return new Set(sentences.map(sentenceKey));
}

function isSameSet(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) return false;
  for (const key of left) {
    if (!right.has(key)) return false;
  }
  return true;
}

function groupKey(exercise: ExerciseRow): string {
  return [
    exercise.userId,
    exercise.level,
    exercise.topicName,
    exercise.subtopicName ?? "",
  ].join(" | ");
}

/**
 * A review exercise holds exactly the sentences the source exercise marked as
 * incorrect, and was created after it.
 */
function isReviewOfSource(
  exercise: ExerciseRow,
  sources: { id: string; groupKey: string; createdAt: Date; incorrectKeys: Set<string> }[]
): boolean {
  const keys = sentenceKeys(toSentences(exercise.sentences));
  if (keys.size === 0) return false;

  const key = groupKey(exercise);
  for (const source of sources) {
    if (source.id === exercise.id) continue;
    if (source.groupKey !== key) continue;
    if (source.incorrectKeys.size === 0) continue;
    if (!isSameSet(source.incorrectKeys, keys)) continue;
    if (source.createdAt.getTime() >= exercise.createdAt.getTime()) continue;
    return true;
  }
  return false;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");

  const exercises = (await prisma.exercise.findMany({
    select: {
      id: true,
      userId: true,
      level: true,
      topicName: true,
      subtopicName: true,
      status: true,
      isReview: true,
      createdAt: true,
      sentences: true,
    },
    orderBy: { createdAt: "asc" },
  })) as ExerciseRow[];

  const sources = exercises
    .filter((exercise) => exercise.status === "evaluated")
    .map((exercise) => ({
      id: exercise.id,
      groupKey: groupKey(exercise),
      createdAt: exercise.createdAt,
      incorrectKeys: sentenceKeys(
        toSentences(exercise.sentences).filter(
          (sentence) => sentence.isCorrect === false
        )
      ),
    }));

  const reviewIds = new Set<string>();

  for (const exercise of exercises) {
    if (!isReviewOfSource(exercise, sources)) continue;
    reviewIds.add(exercise.id);
  }

  const groups = new Map<string, ExerciseRow[]>();
  for (const exercise of exercises) {
    if (!reviewIds.has(exercise.id)) continue;
    const key = groupKey(exercise);
    const group = groups.get(key) ?? [];
    group.push(exercise);
    groups.set(key, group);
  }

  const toDelete: string[] = [];
  const toKeep: string[] = [];

  for (const [key, group] of groups) {
    // A review exercise flagged by the app is already the canonical one for the
    // topic: the DB allows only one of them, so legacy copies are removed.
    const flagged = group.filter((exercise) => exercise.isReview);
    if (flagged.length > 0) {
      for (const exercise of group) {
        if (exercise.isReview) toKeep.push(exercise.id);
        else toDelete.push(exercise.id);
      }
      console.log(
        `[${key}] reviews: ${group.length}, keep: ${flagged[0]!.id} (already flagged), delete: ${group.length - flagged.length}`
      );
      continue;
    }

    const newest = group.reduce((latest, current) =>
      current.createdAt.getTime() > latest.createdAt.getTime() ? current : latest
    );
    for (const exercise of group) {
      if (exercise.id === newest.id) {
        toKeep.push(exercise.id);
      } else {
        toDelete.push(exercise.id);
      }
    }
    console.log(
      `[${key}] reviews: ${group.length}, keep: ${newest.id} (${newest.createdAt.toISOString()}), delete: ${group.length - 1}`
    );
  }

  if (toDelete.length === 0 && toKeep.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  if (!apply) {
    console.log(
      `\nDry run: ${toDelete.length} duplicates would be deleted, ${toKeep.length} review exercises would be flagged. Re-run with --apply.`
    );
    return;
  }

  await prisma.exercise.deleteMany({ where: { id: { in: toDelete } } });
  await prisma.exercise.updateMany({
    where: { id: { in: toKeep } },
    data: { isReview: true },
  });

  console.log(
    `\nDeleted ${toDelete.length} duplicate review exercises, kept ${toKeep.length}.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
