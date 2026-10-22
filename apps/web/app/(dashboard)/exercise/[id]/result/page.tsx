import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { ERROR_CATEGORY } from "@lingua/shared";
import { MediaRecommendations } from "@/components/exercise/media-recommendations";
import { ResultCard } from "@/components/exercise/result-card";
import { SentenceReviewList } from "@/components/exercise/sentence-review-list";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

type PageProps = {
  params: { id: string };
  searchParams?: { from?: string | string[] };
};

export default async function ExerciseResultPage({
  params,
  searchParams,
}: PageProps) {
  const fromHistory = searchParams?.from === "history";

  const user = await requireUser();
  const exercise = await prisma.exercise.findFirst({
    where: {
      id: params.id,
      userId: user.id,
    },
  });

  if (!exercise) {
    redirect("/exercise/app");
  }

  if (exercise.status !== "evaluated") {
    redirect("/exercise/app");
  }

  const sentences = Array.isArray(exercise.sentences)
    ? (exercise.sentences as any[])
    : [];

  const vocabularyList = sentences.flatMap((s) => {
    const value = s?.vocabularyToAdd;
    if (!value) return [];
    const list = Array.isArray(value) ? value : [value];
    return list.filter((v) => v?.word);
  });

  const hasVocabulary = vocabularyList.length > 0;

  const hasMistakes = sentences.some((s) => s?.isCorrect === false);

  const reviewableErrorCount = await prisma.userError.count({
    where: {
      exerciseId: exercise.id,
      category: {
        in: [ERROR_CATEGORY.SPELLING, ERROR_CATEGORY.VOCABULARY],
      },
    },
  });

  const hasReviewWords = hasVocabulary || reviewableErrorCount > 0;

  const isPassed =
    (exercise.topicScore ?? 0) >= 80 && (exercise.grammarScore ?? 0) >= 80;

  return (
    <div className="ml-0 flex w-full max-w-6xl flex-col gap-4 px-4 py-4 text-left md:px-6">
      <Link
        href={fromHistory ? "/exercises" : "/plan"}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {fromHistory ? "Назад до вправ" : "Назад до плану"}
      </Link>

      <div className="space-y-1 text-left">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Results</h1>
          {isPassed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Passed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              Needs Practice
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {exercise.topicName}
          {exercise.subtopicName ? ` — ${exercise.subtopicName}` : ""}
        </p>
      </div>

      <ResultCard
        exerciseId={exercise.id}
        hasMistakes={hasMistakes}
        topicScore={exercise.topicScore}
        grammarScore={exercise.grammarScore}
        reviewWordsHref={
          hasReviewWords
            ? `/exercise/${exercise.id}/vocabulary${
                fromHistory ? "?from=history" : ""
              }`
            : null
        }
      />

      <div className="w-full">
        <SentenceReviewList sentences={sentences as any} />
      </div>

      {hasVocabulary && (
        <div className="w-full space-y-3 rounded-lg border border-border bg-card/60 p-4">
          <h2 className="font-display text-xl">Words to learn</h2>
          <div className="flex flex-wrap gap-2">
            {vocabularyList.map((v: any, idx: number) => (
              <span
                key={`${v.word}-${idx}`}
                className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-medium"
              >
                {v.word}
                {v.translation ? ` — ${v.translation}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      <MediaRecommendations exerciseId={exercise.id} />
    </div>
  );
}
