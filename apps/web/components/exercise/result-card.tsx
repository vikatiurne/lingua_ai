import { ReviewButton } from "@/components/exercise/review-button";
import { cn } from "@/lib/utils";

type ResultCardProps = {
  exerciseId: string;
  hasMistakes: boolean;
  topicScore?: number | null;
  grammarScore?: number | null;
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
}: ResultCardProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/60 px-4 py-3">
      <div className="flex items-center gap-5">
        <ScorePill label="Topic Score" score={topicScore} />
        <ScorePill label="Grammar Score" score={grammarScore} />
      </div>
      <ReviewButton exerciseId={exerciseId} hasMistakes={hasMistakes} />
    </div>
  );
}
