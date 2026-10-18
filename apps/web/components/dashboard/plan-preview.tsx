import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PlanContent } from "@/lib/plan/generate";
import type { CEFRLevel } from "@lingua/shared";
import { pluralize } from "@/lib/i18n/plural";
import { formatLevelCode } from "@/lib/level";

const MAX_TOPICS = 5;

export function PlanPreview({
  content,
  targetLevel = null,
}: {
  content: PlanContent;
  targetLevel?: CEFRLevel | null;
}) {
  const topics = content.topics.slice(0, MAX_TOPICS);

  const topicsCount = pluralize(
    content.topics.length,
    "тема",
    "теми",
    "тем"
  );
  const description = targetLevel
    ? `${content.topics.length} ${topicsCount} для переходу на ${formatLevelCode(targetLevel)}`
    : `${content.topics.length} ${topicsCount} для закріплення`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl font-semibold tracking-tight">
          Ваш план
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {topics.map((topic, index) => (
            <li key={topic.name} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    topic.priority === "high" && "text-primary"
                  )}
                >
                  {topic.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {topic.subtopics.length}{" "}
                  {pluralize(
                    topic.subtopics.length,
                    "підтема",
                    "підтеми",
                    "підтем"
                  )}
                  {topic.priority === "high" ? " · пріоритет" : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
