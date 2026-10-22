import { z } from "zod";
import type { NextRequest } from "next/server";
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
      // Mark the words the user kept as ready for training (flashcards pick
      // them up). Words removed in the UI stay in the DB with isDeleted=true.
      prisma.userError.updateMany({
        where: {
          exerciseId: params.id,
          userId: user.id,
          word: { in: keptWords },
          isDeleted: false,
        },
        data: { isSavedToTraining: true },
      }),
      // Soft-delete any reviewable word that is no longer in the kept list.
      // Match any category — topic/grammar words appear in the hub too.
      prisma.userError.updateMany({
        where: {
          exerciseId: params.id,
          userId: user.id,
          word: { not: null, notIn: keptWords },
          isDeleted: false,
        },
        data: { isDeleted: true },
      }),
    ]);
  } catch {
    return Response.json({ error: "Failed to save vocabulary" }, { status: 500 });
  }

  return Response.json({ success: true });
}
