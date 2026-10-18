"use client";

import type { ProgressStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { PlanTopic } from "@/lib/plan/generate";
import { cn } from "@/lib/utils";

export function PlanTopicCard({
  topic,
  status,
  isCurrent,
  onToggle,
}: {
  topic: PlanTopic;
  status: ProgressStatus;
  isCurrent: boolean;
  onToggle: (topicName: string, nextStatus: ProgressStatus) => void;
}) {
  const isMastered = status === "mastered";
  const isHigh = topic.priority === "high";
  const checked = isMastered;

  function handleToggle(value: boolean | "indeterminate") {
    const next = value === true;
    onToggle(topic.name, next ? "mastered" : "not_started");
  }

  const card = (
    <Card
      className={cn(
        "h-full",
        isMastered && "border-completed-border bg-completed-bg",
        isCurrent && !isMastered && "border-2 border-primary bg-card",
        !isMastered && !isCurrent && "bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-2 p-3 sm:p-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "font-display text-sm font-semibold leading-tight sm:text-base",
                isMastered && "text-completed-text line-through decoration-completed-text/50"
              )}
            >
              {topic.name}
            </span>
            {isHigh && !isMastered ? <Badge>Пріоритет</Badge> : null}
          </div>

          {topic.subtopics.length > 0 ? (
            <ul className={cn("space-y-0.5", isMastered && "text-completed-text/60")}>
              {topic.subtopics.map((subtopic) => (
                <li
                  key={subtopic.name}
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    isMastered ? "text-inherit" : "text-muted-foreground"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-1 w-1 shrink-0 rounded-full",
                      isMastered ? "bg-completed-text/40" : "bg-muted-foreground/50"
                    )}
                  />
                  <span className="truncate line-through decoration-completed-text/40">
                    {subtopic.name}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <Checkbox
          aria-label="Позначити тему як вивчену"
          className="mt-0.5 shrink-0"
          checked={checked}
          onCheckedChange={handleToggle}
        />
      </div>
    </Card>
  );

  return card;
}
