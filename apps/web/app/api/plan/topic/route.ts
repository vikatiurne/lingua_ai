import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { withRateLimit } from "@/lib/api/with-rate-limit";
import { RATE_LIMITS } from "@/lib/redis/rate-limit";
import { topicStatusSchema } from "@/lib/validation/plan";

async function updateTopicHandler(req: NextRequest): Promise<Response> {
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

  const parsed = topicStatusSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { level, topicName, status } = parsed.data;

  await prisma.topicProgress.upsert({
    where: { userId_level_topicName: { userId: user.id, level, topicName } },
    update: { status },
    create: { userId: user.id, level, topicName, status },
  });

  return Response.json({ ok: true });
}

export const PATCH = withRateLimit(updateTopicHandler, RATE_LIMITS.API);
