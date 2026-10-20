import { redirect } from "next/navigation";
import { VocabularyHub } from "@/components/exercise/vocabulary-hub";
import { requireUser } from "@/lib/auth/session";
import { getExerciseVocabulary } from "@/lib/exercise/vocabulary";

type PageProps = {
  params: { id: string };
  searchParams?: { from?: string | string[] };
};

export default async function ExerciseVocabularyPage({
  params,
  searchParams,
}: PageProps) {
  const fromHistory = searchParams?.from === "history";

  const user = await requireUser();
  const vocabulary = await getExerciseVocabulary(params.id, user.id);

  if (!vocabulary) {
    redirect("/exercise/app");
  }

  return (
    <VocabularyHub
      exerciseId={params.id}
      initialSpelling={vocabulary.spelling}
      initialVocabulary={vocabulary.vocabulary}
      fromHistory={fromHistory}
    />
  );
}
