import { z } from "zod";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

type RouteContext = { params: { id: string } };

const updateVocabularySchema = z.object({
  word: z.string().min(1),
  action: z.enum(["delete", "restore", "move"]),
  to: z.enum(["spelling", "vocabulary"]).optional(),
});

export async function PATCH(
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
  if (!exercise || exercise.userId !== user.id) {
    return Response.json({ error: "Exercise not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateVocabularySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { word, action, to } = parsed.data;

  if (action === "move" && !to) {
    return Response.json(
      { error: '"to" is required for the "move" action' },
      { status: 400 }
    );
  }

  // Match by word only — words may come from any error category (topic,
  // grammar, ...), so every word shown in the Review Words hub is manageable.
  const where = {
    exerciseId: params.id,
    userId: user.id,
    word,
  };

  let data: { isDeleted?: boolean; category?: string };
  if (action === "delete") {
    data = { isDeleted: true };
  } else if (action === "restore") {
    data = { isDeleted: false };
  } else {
    data = { category: to };
  }

  try {
    const result = await prisma.userError.updateMany({ where, data });
    if (result.count === 0) {
      return Response.json({ error: "Word not found" }, { status: 404 });
    }
  } catch {
    return Response.json(
      { error: "Failed to update vocabulary" },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
