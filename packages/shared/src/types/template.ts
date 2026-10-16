import type { SlotEntry } from "./slot";

export type TemplateExample = string;

export type TemplatePattern = {
  id: string;
  pattern: string;
  generation_hint: string;
  slots: Record<string, SlotEntry>;
  examples: TemplateExample[];
};

export type TemplateSubtopic = {
  name: string;
  patterns: TemplatePattern[];
};

export type TemplateTopic = {
  topic: string;
  subtopics: TemplateSubtopic[];
};

export type TemplateFile = {
  level: string;
  version: string;
  slots_ref?: string | string[];
  generation_rules?: {
    min_words?: number;
    max_words?: number;
    avoid?: string[];
    require?: string[];
    default_slot_level?: string;
  };
  topics: TemplateTopic[];
};

export type ResolvedSlot = string[];

export type ResolvedPattern = Omit<TemplatePattern, "slots"> & {
  slots: Record<string, ResolvedSlot>;
};

export type ResolvedTemplateTopic = {
  topic: string;
  subtopics: {
    name: string;
    patterns: ResolvedPattern[];
  }[];
};
