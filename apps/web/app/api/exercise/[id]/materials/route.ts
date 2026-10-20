import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { withRateLimit } from "@/lib/api/with-rate-limit";
import { RATE_LIMITS } from "@/lib/redis/rate-limit";
import { recommendMedia } from "@/lib/exercise/media";

type RouteContext = {
  params: { id: string };
};

async function materialsHandler(
  _req: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exercise = await prisma.exercise.findUnique({
    where: { id: params.id },
  });
  if (!exercise || exercise.userId !== user.id) {
    return Response.json({ error: "Exercise not found" }, { status: 404 });
  }

  const recommendations = await recommendMedia({
    topicName: exercise.topicName,
    subtopicName: exercise.subtopicName,
    level: exercise.level,
  });

  if (recommendations.length === 0) {
    return Response.json(
      { error: "No recommendations available" },
      { status: 502 }
    );
  }

  return Response.json({ recommendations });
}

export const GET = withRateLimit(materialsHandler, RATE_LIMITS.AI);
