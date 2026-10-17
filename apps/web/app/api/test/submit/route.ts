import type { NextRequest } from "next/server";
import { CEFR_LEVELS } from "@lingua/shared";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { withRateLimit } from "@/lib/api/with-rate-limit";
import { RATE_LIMITS } from "@/lib/redis/rate-limit";
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

  const { passwordHash: _, ...safeUser } = updated;
  return Response.json({ user: safeUser, correctCount, totalCount });
}

export const POST = withRateLimit(submitHandler, RATE_LIMITS.API);
