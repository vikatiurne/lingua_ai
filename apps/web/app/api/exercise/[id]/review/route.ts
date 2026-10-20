import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

type StoredSentence = {
  id: string;
  source: string;
  direction: string;
  reference: string;
  isCorrect?: boolean;
};

type RouteContext = {
  params: { id: string };
};

export async function POST(
  _req: Request,
  { params }: RouteContext
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exercise = await prisma.exercise.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!exercise) {
    return Response.json({ error: "Exercise not found" }, { status: 404 });
  }
  if (exercise.status !== "evaluated") {
    return Response.json(
      { error: "Exercise is not evaluated yet" },
      { status: 400 }
    );
  }

  const sentences = Array.isArray(exercise.sentences)
    ? (exercise.sentences as StoredSentence[])
    : [];

  const incorrect = sentences.filter((sentence) => sentence.isCorrect === false);
  if (incorrect.length === 0) {
    return Response.json(
      { error: "No mistakes to review" },
      { status: 400 }
    );
  }

  const reviewSentences = incorrect.map((sentence) => ({
    id: crypto.randomUUID(),
    source: sentence.source,
    direction: sentence.direction,
    reference: sentence.reference,
  }));

  try {
    const newExercise = await prisma.exercise.create({
      data: {
        userId: user.id,
        level: exercise.level,
        topicName: exercise.topicName,
        subtopicName: exercise.subtopicName,
        templateIds: exercise.templateIds,
        sentences: reviewSentences,
        status: "in_progress",
      },
    });
    return Response.json({ newId: newExercise.id });
  } catch {
    return Response.json(
      { error: "Failed to create review exercise" },
      { status: 500 }
    );
  }
}
