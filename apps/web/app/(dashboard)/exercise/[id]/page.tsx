import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  ExerciseForm,
  type ExerciseAppSentence,
} from "@/components/exercise/exercise-form";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

type PageProps = {
  params: { id: string };
  searchParams?: { from?: string | string[] };
};

export default async function ExercisePage({
  params,
  searchParams,
}: PageProps) {
  const fromHistory = searchParams?.from === "history";
  const backHref = fromHistory ? "/exercises" : "/plan";
  const backLabel = fromHistory ? "Назад до вправ" : "Назад до плану";

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

  if (exercise.status === "evaluated") {
    redirect(
      `/exercise/${exercise.id}/result${fromHistory ? "?from=history" : ""}`
    );
  }

  const storedSentences = Array.isArray(exercise.sentences)
    ? (exercise.sentences as Partial<ExerciseAppSentence>[])
    : [];

  const sentences = storedSentences
    .filter(
      (sentence): sentence is ExerciseAppSentence =>
        typeof sentence.id === "string" &&
        typeof sentence.source === "string" &&
        typeof sentence.reference === "string" &&
        (sentence.direction === "uk_en" || sentence.direction === "en_uk")
    )
    .map((sentence) => ({
      id: sentence.id,
      source: sentence.source,
      direction: sentence.direction,
      reference: sentence.reference,
    }));

  if (sentences.length === 0) {
    redirect("/exercise/app");
  }

  return (
    <div className="ml-0 flex w-full max-w-6xl flex-col gap-4 px-4 py-4 text-left md:px-6">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="space-y-1 text-left">
        <h1 className="text-xl font-semibold tracking-tight">
          Виконання вправи
        </h1>
        <p className="text-sm text-muted-foreground">
          {exercise.topicName}
          {exercise.subtopicName ? ` — ${exercise.subtopicName}` : ""}
        </p>
      </div>

      <ExerciseForm exerciseId={exercise.id} sentences={sentences} />
    </div>
  );
}
