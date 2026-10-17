import { describe, expect, it, vi, beforeEach } from "vitest";
import { CEFR_LEVEL, type CEFRLevel } from "@lingua/shared";
import type { WeakTopic } from "../test/gap-map";

const { loadTemplateFile } = vi.hoisted(() => ({
  loadTemplateFile: vi.fn(),
}));

vi.mock("../slots/loader", () => ({
  loadTemplateFile,
}));

import { generatePlanContent } from "./generate";

const templateFile = {
  level: "B1",
  version: "1.0",
  topics: [
    {
      topic: "Present Tenses",
      subtopics: [
        { name: "Present Simple", patterns: [] },
        { name: "Present Perfect", patterns: [] },
      ],
    },
    {
      topic: "Past Tenses",
      subtopics: [{ name: "Past Simple", patterns: [] }],
    },
    {
      topic: "Modal Verbs",
      subtopics: [{ name: "Obligation", patterns: [] }],
    },
  ],
};

function weak(
  topic: string,
  errors: number,
  level: CEFRLevel = CEFR_LEVEL.B1
): WeakTopic {
  return { topic, level, errors, skippedCount: 0 };
}

beforeEach(() => {
  loadTemplateFile.mockResolvedValue(templateFile);
});

describe("generatePlanContent", () => {
  it("empty weakTopics → all normal priority, template order", async () => {
    const content = await generatePlanContent(CEFR_LEVEL.B1, []);

    expect(content.topics.map((t) => t.name)).toEqual([
      "Present Tenses",
      "Past Tenses",
      "Modal Verbs",
    ]);
    for (const topic of content.topics) {
      expect(topic.priority).toBe("normal");
      for (const subtopic of topic.subtopics) {
        expect(subtopic.priority).toBe("normal");
      }
    }
  });

  it("one weak topic → first, priority high, rest normal", async () => {
    const content = await generatePlanContent(CEFR_LEVEL.B1, [
      weak("Modal Verbs", 3),
    ]);

    const first = content.topics[0];
    expect(first?.name).toBe("Modal Verbs");
    expect(first?.priority).toBe("high");
    expect(first?.subtopics.every((s) => s.priority === "high")).toBe(true);
    expect(content.topics.slice(1).map((t) => t.priority)).toEqual([
      "normal",
      "normal",
    ]);
  });

  it("multiple weak topics → sorted by errors DESC, then normal", async () => {
    const content = await generatePlanContent(CEFR_LEVEL.B1, [
      weak("Past Tenses", 2),
      weak("Modal Verbs", 5),
    ]);

    expect(content.topics.map((t) => t.name)).toEqual([
      "Modal Verbs",
      "Past Tenses",
      "Present Tenses",
    ]);
    expect(content.topics.map((t) => t.priority)).toEqual([
      "high",
      "high",
      "normal",
    ]);
  });

  it("weak topics from other levels are ignored", async () => {
    const content = await generatePlanContent(CEFR_LEVEL.B1, [
      weak("Modal Verbs", 5, CEFR_LEVEL.A2),
      weak("Past Tenses", 3, CEFR_LEVEL.B2),
    ]);

    for (const topic of content.topics) {
      expect(topic.priority).toBe("normal");
    }
  });

  it("generatedAt is an ISO 8601 timestamp", async () => {
    const content = await generatePlanContent(CEFR_LEVEL.B1, []);

    expect(content.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(content.generatedAt).toISOString()).toBe(
      content.generatedAt
    );
  });

  it("structure: all PlanTopic and PlanSubtopic fields present", async () => {
    const content = await generatePlanContent(CEFR_LEVEL.B1, [
      weak("Present Tenses", 1),
    ]);

    expect(content.level).toBe(CEFR_LEVEL.B1);
    expect(content.topics.length).toBe(templateFile.topics.length);
    for (const topic of content.topics) {
      expect(topic).toHaveProperty("name");
      expect(topic).toHaveProperty("priority");
      expect(Array.isArray(topic.subtopics)).toBe(true);
      expect(topic.subtopics.length).toBeGreaterThan(0);
      for (const subtopic of topic.subtopics) {
        expect(typeof subtopic.name).toBe("string");
        expect(["high", "normal"]).toContain(subtopic.priority);
      }
    }
  });

  it("unknown topic in weakTopics (not in templates) is ignored", async () => {
    const content = await generatePlanContent(CEFR_LEVEL.B1, [
      weak("Nonexistent Topic", 10),
    ]);

    expect(content.topics.map((t) => t.name)).not.toContain(
      "Nonexistent Topic"
    );
    for (const topic of content.topics) {
      expect(topic.priority).toBe("normal");
    }
  });
});
