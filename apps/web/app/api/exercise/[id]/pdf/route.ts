import type { Exercise, ExerciseSentence } from "@lingua/shared";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { generateExercisePdf } from "@/lib/pdf/generator";

type StoredSentence = {
  source: string;
  direction: "uk_en" | "en_uk";
};

type RouteContext = {
  params: { id: string };
};

export async function GET(
  _req: Request,
  { params }: RouteContext
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await prisma.exercise.findUnique({
    where: { id: params.id },
  });
  if (!record || record.userId !== user.id) {
    return Response.json({ error: "Exercise not found" }, { status: 404 });
  }

  const storedSentences = record.sentences as StoredSentence[];
  const sentences: ExerciseSentence[] = storedSentences.map(
    (stored, index) => ({
      id: String(index),
      source: stored.source,
      direction: stored.direction === "uk_en" ? "uk-en" : "en-uk",
      reference: "",
    })
  );

  const exercise: Exercise = {
    id: record.id,
    userId: record.userId,
    level: record.level,
    topic: record.topicName,
    subtopic: record.subtopicName ?? undefined,
    templateIds: record.templateIds,
    sentences,
    topicScore: record.topicScore ?? undefined,
    grammarScore: record.grammarScore ?? undefined,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    completedAt: record.completedAt?.toISOString(),
  };

  const pdfBytes = await generateExercisePdf(exercise);

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="exercise-${record.id}.pdf"`,
    },
  });
}
