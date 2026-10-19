import type { CEFRLevel, TemplateTopic } from "@lingua/shared";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";

export function TopicList({
  topics,
  level,
}: {
  topics: TemplateTopic[];
  level: CEFRLevel;
}) {
  if (topics.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Тем для цього рівня не знайдено.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 grid-auto-rows-fr md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {topics.map((topic) => (
        <Card key={topic.topic} className="flex h-full flex-col">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:p-4">
            <span className="font-display text-sm font-semibold leading-tight sm:text-base">
              {topic.topic}
            </span>


            <div className="max-h-60 min-h-0 flex-1 overflow-y-auto pr-2">
              <ul className="space-y-0.5">
                {topic.subtopics.map((subtopic) => (
                  <li key={subtopic.name}>
                    <Link
                      href={`/exercise/new?level=${level}&topic=${encodeURIComponent(topic.topic)}&subtopic=${encodeURIComponent(subtopic.name)}`}
                      className="group flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                    >
                      <span
                        aria-hidden
                        className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50 group-hover:bg-primary"
                      />
                      <span className="truncate">{subtopic.name}</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
