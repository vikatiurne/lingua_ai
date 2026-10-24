import type { NextRequest } from "next/server";
import { AIServiceError } from "@/lib/ai/errors";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { withRateLimit } from "@/lib/api/with-rate-limit";
import { RATE_LIMITS } from "@/lib/redis/rate-limit";
import {
  ExerciseValidationError,
  evaluateExercise,
} from "@/lib/exercise/evaluator";

type RouteContext = {
  params: { id: string };
};

async function evaluateHandler(
  req: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exercise = await prisma.exercise.findUnique({
    where: { id: params.id },
  });
  if (!exercise) {
    return Response.json({ error: "Exercise not found" }, { status: 404 });
  }
  if (exercise.userId !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await evaluateExercise(exercise.id);
    return Response.json(result);
  } catch (error) {
    if (error instanceof ExerciseValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AIServiceError) {
      console.error("[exercise/evaluate] AI unavailable", error);
      return Response.json(
        {
          error:
            "AI-сервіс тимчасово недоступний. Ваші відповіді збережено, спробуйте пізніше.",
        },
        { status: 503 }
      );
    }
    console.error("[exercise/evaluate] failed", error);
    return Response.json(
      { error: "Не вдалося оцінити відповіді. Спробуйте ще раз." },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(evaluateHandler, RATE_LIMITS.AI);
