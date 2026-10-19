import type { NextRequest } from "next/server";
import { z } from "zod";
import { CEFR_LEVELS } from "@lingua/shared";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { withRateLimit } from "@/lib/api/with-rate-limit";
import { RATE_LIMITS } from "@/lib/redis/rate-limit";
import { generateExercises } from "@/lib/exercise/generator";

const MAX_SENTENCES = 20;

const generateExerciseSchema = z
  .object({
    level: z.enum(CEFR_LEVELS),
    topic: z.string().min(1),
    subtopic: z.string().min(1),
    uaEnCount: z.number().int().min(0).max(MAX_SENTENCES),
    enUaCount: z.number().int().min(0).max(MAX_SENTENCES),
  })
  .refine(
    (data) => data.uaEnCount + data.enUaCount >= 1 &&
      data.uaEnCount + data.enUaCount <= MAX_SENTENCES,
    {
      message: `Total sentence count must be between 1 and ${MAX_SENTENCES}`,
    }
  );

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

  const { level, topic, subtopic, uaEnCount, enUaCount } = parsed.data;

  let result;
  try {
    result = await generateExercises(user.id, {
      level,
      topic,
      subtopic,
      uaEnCount,
      enUaCount,
    });
  } catch {
    return Response.json(
      { error: "Failed to generate exercise" },
      { status: 500 }
    );
  }

  let exercise;
  try {
    exercise = await prisma.exercise.create({
      data: {
        userId: user.id,
        level,
        topicName: topic,
        subtopicName: subtopic,
        templateIds: result.templateIds,
        sentences: result.sentences,
        status: "generated",
      },
    });
  } catch {
    return Response.json({ error: "Failed to save exercise" }, { status: 500 });
  }

  return Response.json({
    exerciseId: exercise.id,
    isFallback: result.isFallback,
  });
}

export const POST = withRateLimit(generateHandler, RATE_LIMITS.AI);
