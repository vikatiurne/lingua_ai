import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import {
  INVALID_EXERCISE_MESSAGE,
  UNANSWERED_EXERCISE_MESSAGE,
  hasUnansweredSentences,
  parseStoredSentences,
} from "@/lib/exercise/stored-sentences";
import { saveAnswersSchema } from "@/lib/validation/exercise";

type RouteContext = {
  params: { id: string };
};

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
  if (!exercise) {
    return Response.json({ error: "Exercise not found" }, { status: 404 });
  }
  if (exercise.userId !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (exercise.status === "evaluated") {
    return Response.json(
      { error: "Exercise already evaluated" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = saveAnswersSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const sentences = parseStoredSentences(exercise.sentences);
  if (!sentences) {
    return Response.json(
      { error: INVALID_EXERCISE_MESSAGE },
      { status: 400 }
    );
  }

  const answersById = new Map(
    parsed.data.answers.map((answer) => [answer.sentenceId, answer.userAnswer])
  );
  const sentenceIds = new Set(sentences.map((sentence) => sentence.id));
  const hasUnknownSentence = [...answersById.keys()].some(
    (sentenceId) => !sentenceIds.has(sentenceId)
  );
  if (hasUnknownSentence || answersById.size !== parsed.data.answers.length) {
    return Response.json(
      { error: INVALID_EXERCISE_MESSAGE },
      { status: 400 }
    );
  }

  const updatedSentences = sentences.map((sentence) =>
    answersById.has(sentence.id)
      ? { ...sentence, userAnswer: answersById.get(sentence.id) }
      : sentence
  );
  if (hasUnansweredSentences(updatedSentences)) {
    return Response.json(
      { error: UNANSWERED_EXERCISE_MESSAGE },
      { status: 400 }
    );
  }

  await prisma.exercise.update({
    where: { id: exercise.id },
    data: { sentences: updatedSentences, status: "in_progress" },
  });

  return Response.json({ success: true });
}
