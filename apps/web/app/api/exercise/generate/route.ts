import type { NextRequest } from "next/server";
import { z } from "zod";
import { CEFR_LEVELS } from "@lingua/shared";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { withRateLimit } from "@/lib/api/with-rate-limit";
import { RATE_LIMITS } from "@/lib/redis/rate-limit";
import { isFallbackReference } from "@/lib/exercise/fallback";
import { generateExercises } from "@/lib/exercise/generator";
import type { StoredSentence } from "@/lib/exercise/stored-sentences";

const MAX_SENTENCES = 20;

const generateExerciseSchema = z
  .object({
    level: z.enum(CEFR_LEVELS),
    topic: z.string().min(1),
    subtopic: z.string().min(1),
    ukEnCount: z.number().int().min(0).max(MAX_SENTENCES),
    enUkCount: z.number().int().min(0).max(MAX_SENTENCES),
    generationId: z.string().uuid().optional(),
  })
  .refine(
    (data) => data.ukEnCount + data.enUkCount >= 1 &&
      data.ukEnCount + data.enUkCount <= MAX_SENTENCES,
    {
      message: `Total sentence count must be between 1 and ${MAX_SENTENCES}`,
    }
  );

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function existingExerciseResponse(exercise: {
  id: string;
  sentences: unknown;
}): Response {
  const sentences = Array.isArray(exercise.sentences)
    ? (exercise.sentences as StoredSentence[])
    : [];

  return Response.json({
    exerciseId: exercise.id,
    sentences,
    isFallback: sentences.some((sentence) =>
      isFallbackReference(sentence.reference)
    ),
  });
}

async function generateHandler(req: NextRequest): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = generateExerciseSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { level, topic, subtopic, ukEnCount, enUkCount, generationId } =
    parsed.data;

  // The client sends a UUID that is also used as the exercise id. This makes
  // generation idempotent: reloading while the request is in flight returns
  // the already saved exercise instead of creating a second one.
  let exerciseId = generationId;
  if (generationId) {
    const existing = await prisma.exercise.findUnique({
      where: { id: generationId },
      select: { id: true, userId: true, sentences: true },
    });
    if (existing) {
      if (existing.userId === user.id) {
        return existingExerciseResponse(existing);
      }
      // A generation id from another account must not block this user.
      exerciseId = undefined;
    }
  }

  let result;
  try {
    result = await generateExercises(user.id, {
      level,
      topic,
      subtopic,
      ukEnCount,
      enUkCount,
    });
  } catch {
    return Response.json(
      { error: "Failed to generate exercise" },
      { status: 500 }
    );
  }

  const createExercise = (id?: string) =>
    prisma.exercise.create({
      data: {
        ...(id ? { id } : {}),
        userId: user.id,
        level,
        topicName: topic,
        subtopicName: subtopic,
        templateIds: result.templateIds,
        sentences: result.sentences,
        status: "generated",
      },
    });

  let exercise;
  try {
    exercise = await createExercise(exerciseId);
  } catch (error) {
    if (exerciseId && isUniqueConstraintError(error)) {
      const existing = await prisma.exercise.findFirst({
        where: { id: exerciseId, userId: user.id },
        select: { id: true, sentences: true },
      });
      if (existing) return existingExerciseResponse(existing);

      // The id was taken by another account between the two checks. Fall back
      // to a server-generated id so this user is not blocked.
      try {
        exercise = await createExercise();
      } catch {
        return Response.json(
          { error: "Failed to save exercise" },
          { status: 500 }
        );
      }
    } else {
      return Response.json(
        { error: "Failed to save exercise" },
        { status: 500 }
      );
    }
  }

  return Response.json({
    exerciseId: exercise.id,
    sentences: result.sentences,
    isFallback: result.isFallback,
  });
}

export const POST = withRateLimit(generateHandler, RATE_LIMITS.AI);
