import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewButton } from "@/components/exercise/review-button";
import { cn } from "@/lib/utils";

type ResultCardProps = {
  exerciseId: string;
  hasMistakes: boolean;
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

export function ResultCard({
  exerciseId,
  hasMistakes,
  topicScore,
  grammarScore,
  reviewWordsHref,
}: ResultCardProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/60 px-4 py-3">
      <div className="flex items-center gap-5">
        <ScorePill label="Topic Score" score={topicScore} />
        <ScorePill label="Grammar Score" score={grammarScore} />
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
        <ReviewButton exerciseId={exerciseId} hasMistakes={hasMistakes} />
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
