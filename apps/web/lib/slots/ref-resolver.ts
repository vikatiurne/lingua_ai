import type {
  CEFRLevel,
  ResolvedPattern,
  ResolvedSlot,
  ResolvedTemplateTopic,
  SlotEntry,
  SlotLevel,
  SlotWithLevels,
  TemplatePattern,
} from "@lingua/shared";
import { DEFAULT_SLOT_LEVEL, SLOT_LEVEL } from "@lingua/shared";
import { LEVEL_FILES } from "./level-files";
import { loadNounsFile, loadSlotFile, loadTemplateFile } from "./loader";

const REF_PATTERN = /^(slots(?:_nouns)?_[a-z0-9_]+)#\/(.+)$/;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickSlotLevel(
  levels: SlotWithLevels,
  slotLevel: SlotLevel,
  context: string
): string[] {
  const candidates: SlotLevel[] = [slotLevel, DEFAULT_SLOT_LEVEL, SLOT_LEVEL.BASIC];
  for (const candidate of candidates) {
    const value = levels[candidate];
    if (isStringArray(value)) {
      return value;
    }
  }
  throw new Error(
    `Invalid slot format: ${context} (no values for slot level "${slotLevel}")`
  );
}

async function loadSlotRoot(
  file: string,
  cefrLevel: CEFRLevel
): Promise<Record<string, unknown>> {
  // $ref embeds its own file name; templates may reference other levels
  // (e.g. templates_b2 -> slots_b1_plus), so the ref file wins over cefrLevel.
  const filename = `${file}.json`;
  let level = cefrLevel;
  const levelKeys = Object.keys(LEVEL_FILES) as CEFRLevel[];
  const matched = levelKeys.find((key) => {
    const files = LEVEL_FILES[key];
    return files.slots === filename || files.nouns === filename;
  });
  if (matched) {
    level = matched;
  }
  if (file.startsWith("slots_nouns_")) {
    return (await loadNounsFile(level)) as unknown as Record<string, unknown>;
  }
  return (await loadSlotFile(level)) as unknown as Record<string, unknown>;
}

async function resolveSlotValue(
  node: unknown,
  cefrLevel: CEFRLevel,
  slotLevel: SlotLevel,
  context: string
): Promise<string[]> {
  if (isStringArray(node)) {
    return node;
  }
  if (isPlainObject(node)) {
    if (typeof node.$ref === "string") {
      const nestedLevel = typeof node.level === "string" ? (node.level as SlotLevel) : undefined;
      return resolveRef(node.$ref, cefrLevel, nestedLevel ?? slotLevel);
    }
    if ("basic" in node || "intermediate" in node || "advanced" in node) {
      return pickSlotLevel(node as SlotWithLevels, slotLevel, context);
    }
  }
  throw new Error(
    `Invalid slot format: ${context} (expected string array, level object or $ref)`
  );
}

export async function resolveRef(
  ref: string,
  cefrLevel: CEFRLevel,
  slotLevel: SlotLevel = DEFAULT_SLOT_LEVEL
): Promise<string[]> {
  const match = REF_PATTERN.exec(ref);
  if (!match) {
    throw new Error(`Invalid $ref format: ${ref}`);
  }
  const [, file, rawPath] = match;
  if (!file || !rawPath) {
    throw new Error(`Invalid $ref format: ${ref}`);
  }
  const path = rawPath.split("/").filter(Boolean);

  const root = await loadSlotRoot(file, cefrLevel);

  let node: unknown = root;
  for (const segment of path) {
    if (!isPlainObject(node) || !(segment in node)) {
      throw new Error(`Slot path not found: ${ref}`);
    }
    node = node[segment];
  }

  return resolveSlotValue(node, cefrLevel, slotLevel, ref);
}

async function resolveSlotEntry(
  entry: SlotEntry,
  cefrLevel: CEFRLevel,
  slotLevel: SlotLevel,
  context: string
): Promise<ResolvedSlot> {
  if (Array.isArray(entry)) {
    return entry;
  }
  if (typeof entry === "object" && entry !== null) {
    if ("$ref" in entry) {
      return resolveRef(entry.$ref, cefrLevel, entry.level ?? slotLevel);
    }
    return pickSlotLevel(entry, slotLevel, context);
  }
  throw new Error(
    `Invalid slot format: ${context} (expected string array, level object or $ref)`
  );
}

export async function resolveTemplate(
  pattern: TemplatePattern,
  cefrLevel: CEFRLevel,
  slotLevel: SlotLevel = DEFAULT_SLOT_LEVEL
): Promise<ResolvedPattern> {
  const slots: Record<string, ResolvedSlot> = {};
  for (const [name, entry] of Object.entries(pattern.slots)) {
    slots[name] = await resolveSlotEntry(entry, cefrLevel, slotLevel, `${pattern.id}/${name}`);
  }
  return {
    id: pattern.id,
    pattern: pattern.pattern,
    generation_hint: pattern.generation_hint,
    examples: pattern.examples,
    slots,
  };
}

export async function resolveTemplateFile(
  cefrLevel: CEFRLevel,
  slotLevel: SlotLevel = DEFAULT_SLOT_LEVEL
): Promise<ResolvedTemplateTopic[]> {
  const file = await loadTemplateFile(cefrLevel);
  const topics: ResolvedTemplateTopic[] = [];

  for (const topic of file.topics) {
    const subtopics: ResolvedTemplateTopic["subtopics"] = [];
    for (const subtopic of topic.subtopics) {
      const patterns: ResolvedPattern[] = [];
      for (const pattern of subtopic.patterns) {
        patterns.push(await resolveTemplate(pattern, cefrLevel, slotLevel));
      }
      subtopics.push({ name: subtopic.name, patterns });
    }
    topics.push({ topic: topic.topic, subtopics });
  }

  return topics;
}
