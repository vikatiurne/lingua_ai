import type {
  CEFRLevel,
  ResolvedPattern,
  ResolvedTemplateTopic,
  SlotLevel,
} from "@lingua/shared";
import { DEFAULT_SLOT_LEVEL } from "@lingua/shared";
import { resolveTemplateFile } from "./ref-resolver";

const resolvedCache = new Map<string, ResolvedTemplateTopic[]>();

function cacheKey(cefrLevel: CEFRLevel, slotLevel: SlotLevel): string {
  return `${cefrLevel}:${slotLevel}`;
}

async function getResolvedFile(
  cefrLevel: CEFRLevel,
  slotLevel: SlotLevel
): Promise<ResolvedTemplateTopic[]> {
  const key = cacheKey(cefrLevel, slotLevel);
  const cached = resolvedCache.get(key);
  if (cached) return cached;

  const resolved = await resolveTemplateFile(cefrLevel, slotLevel);
  resolvedCache.set(key, resolved);
  return resolved;
}

export function clearTemplateServiceCache(): void {
  resolvedCache.clear();
}

export async function getTopicsForLevel(
  level: CEFRLevel,
  slotLevel: SlotLevel = DEFAULT_SLOT_LEVEL
): Promise<string[]> {
  const file = await getResolvedFile(level, slotLevel);
  return file.map((t) => t.topic);
}

export async function getSubtopicsForTopic(
  level: CEFRLevel,
  topicName: string,
  slotLevel: SlotLevel = DEFAULT_SLOT_LEVEL
): Promise<string[]> {
  const file = await getResolvedFile(level, slotLevel);
  const topic = file.find((t) => t.topic === topicName);
  if (!topic) return [];
  return topic.subtopics.map((s) => s.name);
}

export async function getPatternsForSubtopic(
  level: CEFRLevel,
  topicName: string,
  subtopicName: string,
  slotLevel: SlotLevel = DEFAULT_SLOT_LEVEL
): Promise<ResolvedPattern[]> {
  const file = await getResolvedFile(level, slotLevel);
  const topic = file.find((t) => t.topic === topicName);
  if (!topic) return [];
  const subtopic = topic.subtopics.find((s) => s.name === subtopicName);
  if (!subtopic) return [];
  return subtopic.patterns;
}

export async function getPatternById(
  level: CEFRLevel,
  patternId: string,
  slotLevel: SlotLevel = DEFAULT_SLOT_LEVEL
): Promise<ResolvedPattern | null> {
  const file = await getResolvedFile(level, slotLevel);
  for (const topic of file) {
    for (const subtopic of topic.subtopics) {
      const pattern = subtopic.patterns.find((p) => p.id === patternId);
      if (pattern) return pattern;
    }
  }
  return null;
}

export async function getAllPatternIdsForLevel(
  level: CEFRLevel,
  slotLevel: SlotLevel = DEFAULT_SLOT_LEVEL
): Promise<string[]> {
  const file = await getResolvedFile(level, slotLevel);
  const ids: string[] = [];
  for (const topic of file) {
    for (const subtopic of topic.subtopics) {
      for (const pattern of subtopic.patterns) {
        ids.push(pattern.id);
      }
    }
  }
  return ids;
}
