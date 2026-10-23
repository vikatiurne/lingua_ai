import Link from "next/link";
import { AlertCircle, BookOpen, CheckCircle2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewButton } from "@/components/exercise/review-button";
import { cn } from "@/lib/utils";

type ResultCardProps = {
  exerciseId: string;
  hasMistakes: boolean;
  isReview?: boolean;
  reviewExists?: boolean;
  existingReviewPassed?: boolean;
  existingReviewId?: string | null;
  topicScore?: number | null;
  grammarScore?: number | null;
  reviewWordsHref?: string | null;
};

function getScoreColor(score: number) {
  if (score >= 80) return "text-success";
  if (score < 50) return "text-destructive";
  return "text-foreground";
}

function ScorePill({
  label,
  score,
}: {
  label: string;
  score: number | null | undefined;
}) {
  const value = score ?? 0;

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-lg font-semibold tracking-tight",
          getScoreColor(value),
        )}
      >
        {value}%
      </span>
    </div>
  );
}

function ReviewStatus() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />Є помилки
      </span>
      <span className="text-xs text-muted-foreground">
        Перегляньте розбір нижче
      </span>
    </div>
  );
}

function ReviewPassedStatus() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Тема засвоєна
      </span>
    </div>
  );
}

export function ResultCard({
  exerciseId,
  hasMistakes,
  isReview = false,
  reviewExists = false,
  existingReviewPassed = false,
  existingReviewId = null,
  topicScore,
  grammarScore,
  reviewWordsHref,
}: ResultCardProps) {
  const isPassed = (topicScore ?? 0) >= 80 && (grammarScore ?? 0) >= 80;

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/60 px-4 py-3">
      {isReview ? (
        isPassed ? (
          <ReviewPassedStatus />
        ) : (
          <ReviewStatus />
        )
      ) : (
        <div className="flex items-center gap-5">
          <ScorePill label="Topic Score" score={topicScore} />
          <ScorePill label="Grammar Score" score={grammarScore} />
        </div>
      )}
      <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
        {isReview && !isPassed ? (
          <ReviewButton
            exerciseId={exerciseId}
            hasMistakes={hasMistakes}
            continueLabel="Продовжити роботу над помилками"
          />
        ) : isReview || (reviewExists && existingReviewId && existingReviewPassed) ? (
          <span className="text-sm text-muted-foreground">
            Робота над помилками проведена
          </span>
        ) : reviewExists && existingReviewId ? (
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link href={`/exercise/${existingReviewId}?from=history`}>
              <Play className="mr-2 h-4 w-4" />
              Продовжити роботу над помилками
            </Link>
          </Button>
        ) : (
          <ReviewButton
            exerciseId={exerciseId}
            hasMistakes={hasMistakes}
          />
        )}
        {reviewWordsHref ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full bg-accent text-accent-foreground shadow-sm hover:bg-accent/80 sm:w-auto"
          >
            <Link href={reviewWordsHref}>
              <BookOpen className="mr-2 h-4 w-4" />
              Review Words
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
