import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { PdfCheckForm } from "@/components/exercise/pdf-check-form";
import type { ExerciseAppSentence } from "@/components/exercise/exercise-form";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

type PageProps = {
  params: { id: string };
};

export default async function PdfCheckPage({ params }: PageProps) {
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
    redirect(`/exercise/${exercise.id}/result`);
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
        href="/plan"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад до плану
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 text-left">
          <h1 className="text-xl font-semibold tracking-tight">
            Перевірка результатів (PDF)
          </h1>
          <p className="text-sm text-muted-foreground">
            {exercise.topicName}
            {exercise.subtopicName ? ` — ${exercise.subtopicName}` : ""}
          </p>
        </div>

        <Button variant="outline" size="sm" asChild>
          <a href={`/api/exercise/${exercise.id}/pdf`}>
            <Download />
            Завантажити PDF ще раз
          </a>
        </Button>
      </div>

      <PdfCheckForm exerciseId={exercise.id} sentences={sentences} />
    </div>
  );
}
