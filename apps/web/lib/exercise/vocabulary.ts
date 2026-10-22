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
  vocabularyToAdd?: VocabularyWord | VocabularyWord[];
};

type ErrorRow = {
  category: string | null;
  word: string | null;
  translation: string | null;
  isDeleted: boolean;
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
        select: {
          category: true,
          word: true,
          translation: true,
          isDeleted: true,
        },
      },
    },
  });

  if (!exercise) return null;

  const errorRows = exercise.errors.filter((row) => row.word);
  const knownWords = new Set(
    errorRows.map((row) => (row.word as string).trim().toLowerCase())
  );

  const spelling: VocabularyWord[] = [];
  const vocabulary: VocabularyWord[] = [];
  const spellingWords = new Set<string>();

  for (const row of errorRows) {
    if (row.isDeleted) continue;
    const entry: VocabularyWord = {
      word: row.word as string,
      translation: row.translation ?? "",
    };
    if (row.category === ERROR_CATEGORY.SPELLING) {
      spellingWords.add(entry.word.trim().toLowerCase());
      spelling.push(entry);
    } else {
      // Default bucket for vocabulary / null / unknown categories.
      vocabulary.push(entry);
    }
  }

  // A word already filed as a spelling mistake must not also appear
  // under vocabulary, even if some rows carry a different category.
  const vocabularyFiltered = vocabulary.filter(
    (entry) => !spellingWords.has(entry.word.trim().toLowerCase())
  );

  // Words from the sentence JSON snapshot that were never written to
  // user_errors (e.g. older exercises) go to the vocabulary column.
  const sentences = Array.isArray(exercise.sentences)
    ? (exercise.sentences as StoredSentence[])
    : [];
  const fromSentences = sentences.flatMap((s) => {
    const value = s?.vocabularyToAdd;
    if (!value) return [];
    const list = Array.isArray(value) ? value : [value];
    return list.filter(
      (entry) =>
        entry?.word &&
        !knownWords.has(entry.word.trim().toLowerCase())
    );
  });

  return {
    spelling: dedupeWords(spelling),
    vocabulary: dedupeWords([...vocabularyFiltered, ...fromSentences]),
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
