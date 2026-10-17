import type { NextRequest } from "next/server";
import { CEFR_LEVELS } from "@lingua/shared";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { withRateLimit } from "@/lib/api/with-rate-limit";
import { RATE_LIMITS } from "@/lib/redis/rate-limit";
import { analyzeGaps, persistGaps } from "@/lib/test/gap-map";
import { loadTestQuestions } from "@/lib/test/loader";
import { testSubmissionSchema } from "@/lib/validation/test";

async function submitHandler(req: NextRequest): Promise<Response> {
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

  const parsed = testSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { level, correctCount, totalCount } = parsed.data;
  const currentIndex = CEFR_LEVELS.indexOf(level);
  const targetLevel = CEFR_LEVELS[currentIndex + 1] ?? level;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { level, targetLevel },
  });

  const questions = loadTestQuestions();
  const gaps = analyzeGaps(parsed.data.answers, questions);

  let weakTopics = gaps;
  try {
    await persistGaps(user.id, gaps);
  } catch (error) {
    console.error("[test/submit] persistGaps failed", error);
    weakTopics = [];
  }

  const { passwordHash: _, ...safeUser } = updated;
  return Response.json({ user: safeUser, correctCount, totalCount, weakTopics });
}

export const POST = withRateLimit(submitHandler, RATE_LIMITS.API);
