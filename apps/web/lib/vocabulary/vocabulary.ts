import { ERROR_CATEGORY, VOCABULARY_STATUS } from "@lingua/shared";
import { prisma } from "@/lib/db/client";
import type { VocabularyWord } from "@/lib/exercise/vocabulary";
import { getDayRange, toDateKey } from "./format";

export type { VocabularyWord };

export type VocabularyBucket = "flashcards" | "spelling";

export type VocabularyGroup = {
  date: string;
  flashcardsCount: number;
  flashcardsWords: VocabularyWord[];
  spellingCount: number;
  spellingWords: VocabularyWord[];
};

export type GroupedVocabulary = {
  unlearned: VocabularyGroup[];
  learned: VocabularyGroup[];
};

type SavedWordRow = {
  word: string | null;
  translation: string | null;
  category: string | null;
  createdAt: Date;
  learningStatus: (typeof VOCABULARY_STATUS)[keyof typeof VOCABULARY_STATUS];
};

type GroupAccumulator = {
  flashcards: Map<string, VocabularyWord>;
  spelling: Map<string, VocabularyWord>;
};

export async function getGroupedVocabulary(
  userId: string
): Promise<GroupedVocabulary> {
  const rows = await getSavedWords(userId);

  const unlearned = new Map<string, GroupAccumulator>();
  const learned = new Map<string, GroupAccumulator>();

  for (const row of rows) {
    if (!row.word || !row.translation) continue;

    const key = row.word.trim().toLowerCase();
    if (!key) continue;

    const date = toDateKey(row.createdAt);
    const target =
      row.learningStatus === VOCABULARY_STATUS.LEARNED ? learned : unlearned;
    const accumulator = target.get(date) ?? createAccumulator();
    const words =
      row.category === ERROR_CATEGORY.SPELLING
        ? accumulator.spelling
        : accumulator.flashcards;

    if (!words.has(key)) {
      words.set(key, {
        word: row.word.trim(),
        translation: row.translation.trim(),
      });
    }

    target.set(date, accumulator);
  }

  return {
    unlearned: toGroups(unlearned),
    learned: toGroups(learned),
  };
}

export async function getVocabularyWordsByDate(
  userId: string,
  dateKey: string,
  bucket: VocabularyBucket
): Promise<VocabularyWord[]> {
  const range = getDayRange(dateKey);
  if (!range) return [];

  const rows = await getSavedWords(userId, range, "asc");
  const words = splitByCategory(rows);

  return Array.from(
    (bucket === "spelling" ? words.spelling : words.flashcards).values()
  );
}

export async function markVocabularyLearned(
  userId: string,
  options: { date: string; words?: string[] }
): Promise<number> {
  const range = getDayRange(options.date);
  if (!range) return 0;

  const words = options.words ?? [];
  const result = await prisma.userError.updateMany({
    where: {
      userId,
      isSavedToTraining: true,
      isDeleted: false,
      createdAt: { gte: range.start, lt: range.end },
      word: words.length > 0 ? { not: null, in: words } : { not: null },
    },
    data: { learningStatus: VOCABULARY_STATUS.LEARNED },
  });

  return result.count;
}

async function getSavedWords(
  userId: string,
  dateRange?: { start: Date; end: Date },
  order: "asc" | "desc" = "desc"
): Promise<SavedWordRow[]> {
  return prisma.userError.findMany({
    where: {
      userId,
      isSavedToTraining: true,
      isDeleted: false,
      word: { not: null },
      translation: { not: null },
      ...(dateRange
        ? { createdAt: { gte: dateRange.start, lt: dateRange.end } }
        : {}),
    },
    select: {
      word: true,
      translation: true,
      category: true,
      createdAt: true,
      learningStatus: true,
    },
    orderBy: { createdAt: order },
  });
}

function splitByCategory(rows: SavedWordRow[]): {
  flashcards: Map<string, VocabularyWord>;
  spelling: Map<string, VocabularyWord>;
} {
  const flashcards = new Map<string, VocabularyWord>();
  const spelling = new Map<string, VocabularyWord>();

  for (const row of rows) {
    if (!row.word || !row.translation) continue;

    const key = row.word.trim().toLowerCase();
    if (!key) continue;

    const target =
      row.category === ERROR_CATEGORY.SPELLING ? spelling : flashcards;
    if (!target.has(key)) {
      target.set(key, {
        word: row.word.trim(),
        translation: row.translation.trim(),
      });
    }
  }

  return { flashcards, spelling };
}

function createAccumulator(): GroupAccumulator {
  return {
    flashcards: new Map<string, VocabularyWord>(),
    spelling: new Map<string, VocabularyWord>(),
  };
}

function toGroups(buckets: Map<string, GroupAccumulator>): VocabularyGroup[] {
  return Array.from(buckets.entries()).map(([date, accumulator]) => {
    const flashcardsWords = Array.from(accumulator.flashcards.values());
    const spellingWords = Array.from(accumulator.spelling.values());

    return {
      date,
      flashcardsCount: flashcardsWords.length,
      flashcardsWords,
      spellingCount: spellingWords.length,
      spellingWords,
    };
  });
}
