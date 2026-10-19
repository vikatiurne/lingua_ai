import type { CEFRLevel } from "@lingua/shared";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { completeCached } from "@/lib/ai/cached";
import type { AIMessage } from "@/lib/ai/types";
import { logAIRequest } from "@/lib/ai/logger";
import { getPrompt } from "@/lib/ai/prompts/generate-exercise";
import { loadTemplateFile } from "@/lib/slots/loader";

const MAX_SENTENCES = 20;
const MAX_PAST_ERRORS = 5;
const FALLBACK_EXAMPLE_LIMIT = 6;
const AI_TIMEOUT_MS = 8000;

const aiSentenceSchema = z.object({
  source: z.string().min(1),
  direction: z.enum(["uk_en", "en_uk"]),
  reference: z.string().min(1),
});

const aiResponseSchema = z.object({
  sentences: z.array(aiSentenceSchema).min(1).max(MAX_SENTENCES),
});

export type GeneratedSentence = z.infer<typeof aiSentenceSchema> & {
  id: string;
};

export type GenerateExercisesParams = {
  level: CEFRLevel;
  topic: string;
  subtopic: string;
  ukEnCount: number;
  enUkCount: number;
};

export type GenerateExercisesResult = {
  sentences: GeneratedSentence[];
  templateIds: string[];
  isFallback: boolean;
};

export async function generateExercises(
  userId: string,
  params: GenerateExercisesParams
): Promise<GenerateExercisesResult> {
  const pastErrorRecords = await prisma.userError.findMany({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
    take: MAX_PAST_ERRORS,
  });
  const pastErrors = pastErrorRecords.map((record) => record.sentence);

  const template = await resolveTemplate(params.level, params.topic, params.subtopic);

  const prompt = getPrompt({
    ...params,
    hint: template.hint,
    examples: template.examples,
    pastErrors,
  });

  const fallbackSentences = buildFallbackSentences(template.examples);

  let raw: string;
  try {
    raw = await callAI([{ role: "user", content: prompt }]);
  } catch (error) {
    logGenerationError("initial request failed", error);
    return {
      sentences: fallbackSentences,
      templateIds: template.templateIds,
      isFallback: true,
    };
  }

  let parsed: z.infer<typeof aiResponseSchema>;
  try {
    parsed = parseAIResponse(raw);
  } catch (error) {
    logGenerationError("invalid JSON from AI, attempting self-correction", error);
    try {
      const corrected = await callSelfCorrection(prompt, raw, error);
      parsed = parseAIResponse(corrected);
    } catch (correctionError) {
      logGenerationError("self-correction failed, falling back to examples", correctionError);
      return {
        sentences: fallbackSentences,
        templateIds: template.templateIds,
        isFallback: true,
      };
    }
  }

  return {
    sentences: withIds(parsed.sentences),
    templateIds: template.templateIds,
    isFallback: false,
  };
}

function withIds(
  sentences: z.infer<typeof aiSentenceSchema>[]
): GeneratedSentence[] {
  return sentences.map((sentence) => ({
    id: crypto.randomUUID(),
    ...sentence,
  }));
}

type ResolvedTemplate = {
  hint: string;
  examples: string[];
  templateIds: string[];
};

async function resolveTemplate(
  level: CEFRLevel,
  topic: string,
  subtopic: string
): Promise<ResolvedTemplate> {
  const templateFile = await loadTemplateFile(level);
  const topicEntry = templateFile.topics.find((entry) => entry.topic === topic);
  const subtopicEntry = topicEntry?.subtopics.find(
    (entry) => entry.name === subtopic
  );

  if (!subtopicEntry) {
    console.warn(
      `[exercise/generate] Template not found for level=${level}, topic=${topic}, subtopic=${subtopic}. Generating without hint and examples.`
    );
    return { hint: "", examples: [], templateIds: [] };
  }

  return {
    hint: subtopicEntry.patterns.map((p) => p.generation_hint).join("\n"),
    examples: subtopicEntry.patterns
      .flatMap((p) => p.examples)
      .slice(0, FALLBACK_EXAMPLE_LIMIT),
    templateIds: subtopicEntry.patterns.map((p) => p.id),
  };
}

function buildFallbackSentences(examples: string[]): GeneratedSentence[] {
  return examples.slice(0, MAX_SENTENCES).map((source) => ({
    id: crypto.randomUUID(),
    source,
    direction: "en_uk",
    reference: "",
  }));
}

async function callAI(messages: AIMessage[]): Promise<string> {
  const result = await completeCached(messages, {
    responseFormat: "json",
    temperature: 0.7,
    timeoutMs: AI_TIMEOUT_MS,
  });
  return result.text;
}

async function callSelfCorrection(
  prompt: string,
  raw: string,
  error: unknown
): Promise<string> {
  const message = error instanceof Error ? error.message : String(error);
  return callAI([
    { role: "user", content: prompt },
    { role: "assistant", content: raw },
    {
      role: "user",
      content:
        `Your previous response was invalid JSON. Error: ${message}. ` +
        "Return ONLY valid JSON in the requested format.",
    },
  ]);
}

function parseAIResponse(raw: string): z.infer<typeof aiResponseSchema> {
  const json: unknown = JSON.parse(raw);
  return aiResponseSchema.parse(json);
}

function logGenerationError(stage: string, error: unknown): void {
  logAIRequest({
    provider: "generate-exercise",
    model: stage,
    promptLength: 0,
    responseLength: 0,
    latencyMs: 0,
    error: error instanceof Error ? error.message : String(error),
  });
}
