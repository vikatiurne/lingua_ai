import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getExerciseVocabulary } from "@/lib/exercise/vocabulary";

type RouteContext = { params: { id: string } };

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vocabulary = await getExerciseVocabulary(params.id, user.id);
  if (!vocabulary) {
    return Response.json({ error: "Exercise not found" }, { status: 404 });
  }

  return Response.json(vocabulary);
}
