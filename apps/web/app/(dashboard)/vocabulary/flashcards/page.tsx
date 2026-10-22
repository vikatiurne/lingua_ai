import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VocabularyFlashcardSession } from "@/components/vocabulary/vocabulary-flashcard-session";
import { requireUser } from "@/lib/auth/session";
import { formatDateLabel } from "@/lib/vocabulary/format";
import { getVocabularyWordsByDate } from "@/lib/vocabulary/vocabulary";

type PageProps = {
  searchParams: { date?: string };
};

export default async function VocabularyFlashcardsPage({
  searchParams,
}: PageProps) {
  const user = await requireUser();
  const date = searchParams.date ?? "";
  const words = date
    ? await getVocabularyWordsByDate(user.id, date, "flashcards")
    : [];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="w-fit px-0 hover:bg-transparent">
        <Link href="/vocabulary">
          <ArrowLeft className="h-4 w-4" />
          До словника
        </Link>
      </Button>

      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {date ? `Картки · ${formatDateLabel(date)}` : "Картки"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Пройдіть усі картки: клікніть, щоб перевернути, і оцініть, чи знаєте
          слово.
        </p>
      </div>

      {words.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card/60 px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Для цієї дати немає слів для тренування.
          </p>
          <Button asChild>
            <Link href="/vocabulary">Назад до словника</Link>
          </Button>
        </div>
      ) : (
        <VocabularyFlashcardSession words={words} date={date} />
      )}
    </div>
  );
}
