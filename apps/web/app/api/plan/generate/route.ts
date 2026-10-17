import type { NextRequest } from "next/server";
import type { WeakTopic } from "@/lib/test/gap-map";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { withRateLimit } from "@/lib/api/with-rate-limit";
import { RATE_LIMITS } from "@/lib/redis/rate-limit";
import { generatePlanContent } from "@/lib/plan/generate";
import { savePlan } from "@/lib/plan/persist";

async function generatePlanHandler(req: NextRequest): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.level === null) {
    return Response.json(
      { error: "Level not set. Complete the test first." },
      { status: 400 }
    );
  }

  const progress = await prisma.topicProgress.findMany({
    where: {
      userId: user.id,
      level: user.level,
      status: { in: ["not_started", "in_progress"] },
    },
  });

  const weakTopics: WeakTopic[] = progress.map((p) => ({
    topic: p.topicName,
    level: p.level,
    errors: 1,
    skippedCount: 0,
  }));

  let content;
  try {
    content = await generatePlanContent(user.level, weakTopics);
  } catch {
    return Response.json(
      { error: "Не вдалось завантажити шаблони" },
      { status: 500 }
    );
  }

  let plan;
  try {
    plan = await savePlan(user.id, content);
  } catch {
    return Response.json({ error: "Не вдалось зберегти план" }, { status: 500 });
  }

  return Response.json({ plan });
}

export const POST = withRateLimit(generatePlanHandler, RATE_LIMITS.API);
