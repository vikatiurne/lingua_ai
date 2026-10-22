import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ExercisesHistory,
  type ExerciseHistoryItem,
} from "@/components/exercise/exercises-history";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export default async function ExercisesPage() {
  const user = await requireUser();

  const exercises = await prisma.exercise.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      topicName: true,
      subtopicName: true,
      status: true,
      isReview: true,
      topicScore: true,
      grammarScore: true,
      createdAt: true,
    },
  });

  const items: ExerciseHistoryItem[] = exercises.map((exercise) => ({
    ...exercise,
    createdAt: exercise.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Мої вправи
        </h1>
        <p className="text-sm text-muted-foreground">
          Історія всіх вправ — завершених і незавершених.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card/60 px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            У вас ще немає вправ. Перейдіть до плану, щоб почати.
          </p>
          <Button asChild>
            <Link href="/plan">
              Перейти до плану
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <ExercisesHistory exercises={items} />
      )}
    </div>
  );
}
