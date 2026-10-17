import type { CEFRLevel } from "@lingua/shared";
import { loadTemplateFile } from "../slots/loader";
import type { WeakTopic } from "../test/gap-map";

export type PlanPriority = "high" | "normal";

export type PlanSubtopic = {
  name: string;
  priority: PlanPriority;
};

export type PlanTopic = {
  name: string;
  priority: PlanPriority;
  subtopics: PlanSubtopic[];
};

export type PlanContent = {
  level: CEFRLevel;
  generatedAt: string;
  topics: PlanTopic[];
};

export async function generatePlanContent(
  level: CEFRLevel,
  weakTopics: WeakTopic[]
): Promise<PlanContent> {
  const templateFile = await loadTemplateFile(level);

  const weakTopicsForLevel = weakTopics.filter((w) => w.level === level);

  const errorsByTopic = new Map<string, number>();
  for (const w of weakTopicsForLevel) {
    errorsByTopic.set(w.topic, w.errors);
  }

  const topics: PlanTopic[] = templateFile.topics.map((topic) => {
    const errors = errorsByTopic.get(topic.topic) ?? 0;
    const priority: PlanPriority = errors > 0 ? "high" : "normal";
    return {
      name: topic.topic,
      priority,
      subtopics: topic.subtopics.map((subtopic) => ({
        name: subtopic.name,
        priority,
      })),
    };
  });

  topics.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority === "high" ? -1 : 1;
    }
    if (a.priority === "high") {
      return (errorsByTopic.get(b.name) ?? 0) - (errorsByTopic.get(a.name) ?? 0);
    }
    return 0;
  });

  return {
    level,
    generatedAt: new Date().toISOString(),
    topics,
  };
}
