import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { formatDateLabel } from "@/lib/vocabulary/format";
import { getVocabularyWordsByDate } from "@/lib/vocabulary/vocabulary";

type PageProps = {
  searchParams: { date?: string };
};

export default async function VocabularySpellingPage({
  searchParams,
}: PageProps) {
  const user = await requireUser();
  const date = searchParams.date ?? "";
  const words = date
    ? await getVocabularyWordsByDate(user.id, date, "spelling")
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
          {date ? `Написання · ${formatDateLabel(date)}` : "Написання"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Слова, які треба написати на слух. Сама вправа з&apos;явиться пізніше
          — поки що ось список.
        </p>
      </div>

      {words.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card/60 px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Для цієї дати немає слів для написання.
          </p>
          <Button asChild>
            <Link href="/vocabulary">Назад до словника</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex max-w-2xl flex-col gap-2">
          {words.map((word) => (
            <li
              key={word.word}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-card/60 px-3 py-2"
            >
              <span className="font-medium">{word.word}</span>
              <span className="text-sm text-muted-foreground">
                {word.translation}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
