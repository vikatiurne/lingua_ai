import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { completeCached } from "@/lib/ai/cached";
import { logAIRequest } from "@/lib/ai/logger";
import type { AIMessage } from "@/lib/ai/types";
import { getPrompt } from "@/lib/ai/prompts/evaluate-answers";

const AI_TIMEOUT_MS = 10000;
const AI_TEMPERATURE = 0.2;
const SKIPPED_ANSWER = "...";

const evaluatedSentenceSchema = z.object({
  id: z.string().min(1),
  isCorrect: z.boolean(),
  errorType: z.enum(["topic", "grammar", "skipped", "none"]),
  explanation: z.string().min(1),
  vocabularyToAdd: z
    .object({
      word: z.string().min(1),
      translation: z.string().min(1),
    })
    .optional(),
});

const evaluationResponseSchema = z.object({
  topicScore: z.number().min(0).max(100),
  grammarScore: z.number().min(0).max(100),
  evaluatedSentences: z.array(evaluatedSentenceSchema).min(1),
});

export type EvaluatedSentence = z.infer<typeof evaluatedSentenceSchema>;

export type EvaluationResult = {
  topicScore: number;
  grammarScore: number;
  evaluatedSentences: EvaluatedSentence[];
};

type StoredSentence = {
  id: string;
  source: string;
  direction: string;
  reference: string;
  userAnswer?: string;
  isCorrect?: boolean;
  errorType?: string;
  explanation?: string;
  vocabularyToAdd?: { word: string; translation: string };
};

const ERROR_TYPE_TO_DB: Record<EvaluatedSentence["errorType"], "topic" | "general"> = {
  topic: "topic",
  grammar: "general",
  skipped: "general",
  none: "general",
};

export async function evaluateExercise(exerciseId: string): Promise<EvaluationResult> {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
  });
  if (!exercise) {
    throw new Error("Exercise not found");
  }

  const sentences = exercise.sentences as StoredSentence[];
  if (sentences.length === 0) {
    throw new Error("Exercise has no sentences");
  }

  const prompt = getPrompt({
    topic: exercise.topicName,
    sentences: sentences.map((sentence) => ({
      id: sentence.id,
      source: sentence.source,
      reference: normalizeText(sentence.reference),
      userAnswer: normalizeForPrompt(sentence.userAnswer),
    })),
  });

  const raw = await callAI([{ role: "user", content: prompt }]);

  let parsed: z.infer<typeof evaluationResponseSchema>;
  try {
    parsed = parseAIResponse(raw);
  } catch (error) {
    logEvaluationError("invalid JSON from AI", error);
    throw error;
  }

  const evaluatedById = new Map(
    parsed.evaluatedSentences.map((sentence) => [sentence.id, sentence])
  );
  const missing = sentences.filter((sentence) => !evaluatedById.has(sentence.id));
  if (missing.length > 0) {
    const error = new Error(
      `AI did not evaluate sentences: ${missing.map((s) => s.id).join(", ")}`
    );
    logEvaluationError("incomplete AI response", error);
    throw error;
  }

  const updatedSentences = sentences.map((sentence) => {
    const evaluation = evaluatedById.get(sentence.id)!;
    return {
      ...sentence,
      userAnswer: normalizeAnswer(sentence.userAnswer),
      isCorrect: evaluation.isCorrect,
      errorType: evaluation.errorType,
      explanation: evaluation.explanation,
      ...(evaluation.vocabularyToAdd && {
        vocabularyToAdd: evaluation.vocabularyToAdd,
      }),
    };
  });

  const userErrors = sentences.flatMap((sentence) => {
    const evaluation = evaluatedById.get(sentence.id)!;
    if (evaluation.isCorrect) return [];
    return [
      {
        userId: exercise.userId,
        exerciseId: exercise.id,
        type: ERROR_TYPE_TO_DB[evaluation.errorType],
        sentence: sentence.source,
        userAnswer: normalizeAnswer(sentence.userAnswer),
        reference: sentence.reference,
        explanation: evaluation.explanation,
        word: evaluation.vocabularyToAdd?.word,
        translation: evaluation.vocabularyToAdd?.translation,
      },
    ];
  });

  await prisma.$transaction([
    prisma.userError.deleteMany({ where: { exerciseId: exercise.id } }),
    prisma.userError.createMany({ data: userErrors }),
    prisma.exercise.update({
      where: { id: exercise.id },
      data: {
        sentences: updatedSentences,
        topicScore: parsed.topicScore,
        grammarScore: parsed.grammarScore,
        status: "evaluated",
      },
    }),
  ]);

  return {
    topicScore: parsed.topicScore,
    grammarScore: parsed.grammarScore,
    evaluatedSentences: parsed.evaluatedSentences,
  };
}

function normalizeAnswer(userAnswer: string | undefined): string {
  const trimmed = userAnswer?.trim();
  return trimmed ? trimmed : SKIPPED_ANSWER;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"()]/g, "") // Remove punctuation but KEEP apostrophes
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForPrompt(userAnswer: string | undefined): string {
  const answer = normalizeAnswer(userAnswer);
  // Keep the "..." marker intact so the AI still recognizes skipped answers
  if (answer === SKIPPED_ANSWER) return SKIPPED_ANSWER;
  return normalizeText(answer);
}

async function callAI(messages: AIMessage[]): Promise<string> {
  const result = await completeCached(messages, {
    responseFormat: "json",
    temperature: AI_TEMPERATURE,
    timeoutMs: AI_TIMEOUT_MS,
    cacheTtlSeconds: 0,
  });
  return result.text;
}

function parseAIResponse(raw: string): z.infer<typeof evaluationResponseSchema> {
  const json: unknown = JSON.parse(raw);
  return evaluationResponseSchema.parse(json);
}

function logEvaluationError(stage: string, error: unknown): void {
  logAIRequest({
    provider: "evaluate-answers",
    model: stage,
    promptLength: 0,
    responseLength: 0,
    latencyMs: 0,
    error: error instanceof Error ? error.message : String(error),
  });
}
