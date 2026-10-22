import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FlashcardSession } from "@/components/flashcards/flashcard-session";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { ERROR_RECYCLING_STATUS } from "@lingua/shared";

export default async function FlashcardsPage() {
  const user = await requireUser();

  const rows = await prisma.userError.findMany({
    where: {
      userId: user.id,
      isSavedToTraining: true,
      isDeleted: false,
      status: ERROR_RECYCLING_STATUS.ACTIVE,
      word: { not: null },
      translation: { not: null },
    },
    select: { word: true, translation: true },
    distinct: ["word"],
  });

  const words = rows.map((row) => ({
    word: row.word as string,
    translation: row.translation as string,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Flashcards
        </h1>
        <p className="text-sm text-muted-foreground">
          Пройдіть усі картки: клікніть, щоб перевернути, і оцініть, чи
          знаєте слово.
        </p>
      </div>

      {words.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card/60 px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            У вас ще немає слів для тренування. Зберіть слова з вправ — і вони
            з&apos;являться тут.
          </p>
          <Button asChild>
            <Link href="/plan">
              Перейти до плану
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <FlashcardSession words={words} />
      )}
    </div>
  );
}
