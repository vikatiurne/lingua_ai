import { ERROR_CATEGORY } from "@lingua/shared";
import { prisma } from "@/lib/db/client";

export type VocabularyWord = {
  word: string;
  translation: string;
};

export type ExerciseVocabulary = {
  spelling: VocabularyWord[];
  vocabulary: VocabularyWord[];
};

type StoredSentence = {
  vocabularyToAdd?: VocabularyWord;
};

export async function getExerciseVocabulary(
  exerciseId: string,
  userId: string
): Promise<ExerciseVocabulary | null> {
  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId, userId },
    include: {
      errors: {
        where: { word: { not: null } },
        select: { category: true, word: true, translation: true },
      },
    },
  });

  if (!exercise) return null;

  const spelling = exercise.errors
    .filter((e) => e.category === ERROR_CATEGORY.SPELLING && e.word)
    .map((e) => ({ word: e.word as string, translation: e.translation ?? "" }));

  const fromErrors = exercise.errors
    .filter((e) => e.category === ERROR_CATEGORY.VOCABULARY && e.word)
    .map((e) => ({ word: e.word as string, translation: e.translation ?? "" }));

  const sentences = Array.isArray(exercise.sentences)
    ? (exercise.sentences as StoredSentence[])
    : [];

  const fromSentences = sentences
    .filter((s) => s?.vocabularyToAdd?.word)
    .map((s) => s.vocabularyToAdd as VocabularyWord);

  return {
    spelling: dedupeWords(spelling),
    vocabulary: dedupeWords([...fromErrors, ...fromSentences]),
  };
}

function dedupeWords(words: VocabularyWord[]): VocabularyWord[] {
  const seen = new Set<string>();
  const result: VocabularyWord[] = [];

  for (const item of words) {
    const key = item.word.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({ word: item.word.trim(), translation: item.translation.trim() });
  }

  return result;
}
