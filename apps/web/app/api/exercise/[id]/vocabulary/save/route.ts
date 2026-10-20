import { z } from "zod";
import type { NextRequest } from "next/server";
import { ERROR_CATEGORY } from "@lingua/shared";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

type RouteContext = { params: { id: string } };

const wordSchema = z.object({
  word: z.string().min(1),
  translation: z.string(),
});

const saveVocabularySchema = z.object({
  spelling: z.array(wordSchema),
  vocabulary: z.array(wordSchema),
});

export async function POST(
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

  const parsed = saveVocabularySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const keptWords = [
    ...parsed.data.spelling.map((w) => w.word),
    ...parsed.data.vocabulary.map((w) => w.word),
  ];

  try {
    await prisma.$transaction([
      prisma.userError.updateMany({
        where: { exerciseId: params.id, userId: user.id, word: { in: keptWords } },
        data: { isSavedToTraining: true },
      }),
      prisma.userError.deleteMany({
        where: {
          exerciseId: params.id,
          userId: user.id,
          category: {
            in: [ERROR_CATEGORY.SPELLING, ERROR_CATEGORY.VOCABULARY],
          },
          word: { not: null, notIn: keptWords },
        },
      }),
    ]);
  } catch {
    return Response.json({ error: "Failed to save vocabulary" }, { status: 500 });
  }

  return Response.json({ success: true });
}
