"use client";

import { PartyPopper } from "lucide-react";
import { useEffect, useState } from "react";
import type { ProgressStatus } from "@prisma/client";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import type { PlanContent } from "@/lib/plan/generate";
import { formatLevelCode } from "@/lib/level";
import { PlanTopicCard } from "./plan-topic-card";
import type { User } from "@prisma/client";

export type TopicProgressItem = {
  topicName: string;
  status: ProgressStatus;
};

export function PlanTimeline({
  content,
  progress,
  user,
}: {
  content: PlanContent;
  progress: TopicProgressItem[];
  user: Pick<User, "level" | "targetLevel">;
}) {
  const [localProgress, setLocalProgress] = useState<Record<string, ProgressStatus>>(() =>
    progress.reduce(
      (acc, p) => {
        acc[p.topicName] = p.status;
        return acc;
      },
      {} as Record<string, ProgressStatus>
    )
  );

  useEffect(() => {
    setLocalProgress(
      progress.reduce(
        (acc, p) => {
          acc[p.topicName] = p.status;
          return acc;
        },
        {} as Record<string, ProgressStatus>
      )
    );
  }, [progress]);

  const progressMap = new Map(content.topics.map((t) => [t.name, localProgress[t.name] ?? "not_started"]));

  const currentTopicIndex = content.topics.findIndex(
    (topic) => progressMap.get(topic.name) !== "mastered"
  );
  const allMastered = currentTopicIndex === -1;
  const masteredCount = Array.from(progressMap.values()).filter(
    (s) => s === "mastered"
  ).length;
  const totalCount = content.topics.length;
  const progressPercent = totalCount === 0 ? 0 : (masteredCount / totalCount) * 100;

  function handleToggle(topicName: string, nextStatus: ProgressStatus) {
    const prev = localProgress[topicName] ?? "not_started";
    setLocalProgress((prevState) => ({
      ...prevState,
      [topicName]: nextStatus,
    }));

    fetch("/api/plan/topic", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: content.level,
        topicName,
        status: nextStatus,
      }),
    }).catch(() => {
      setLocalProgress((prevState) => ({
        ...prevState,
        [topicName]: prev,
      }));
      toast.error("Не вдалося зберегти. Спробуйте ще раз");
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight">План навчання</h1>
          {user.level ? <Badge>{formatLevelCode(user.level)}</Badge> : null}
        </div>
        {user.targetLevel ? (
          <p className="text-sm text-muted-foreground">
            Наступний рівень: {formatLevelCode(user.targetLevel)}
          </p>
        ) : null}
      </div>

      {totalCount > 0 ? (
        <div className="space-y-2 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Прогрес</span>
            <span className="text-muted-foreground">
              Вивчено {masteredCount} з {totalCount} тем
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      {allMastered && totalCount > 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
          <PartyPopper
            aria-hidden
            className="h-5 w-5 shrink-0 text-success"
          />
          <span>Ви пройшли весь план! Можна генерувати новий.</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {content.topics.map((topic, index) => (
          <PlanTopicCard
            key={topic.name}
            topic={topic}
            level={content.level}
            status={progressMap.get(topic.name) ?? "not_started"}
            isCurrent={index === currentTopicIndex}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}
