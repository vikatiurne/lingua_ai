import { getCurrentUser } from "@/lib/auth/session";
import { getGroupedVocabulary } from "@/lib/vocabulary/vocabulary";

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const grouped = await getGroupedVocabulary(user.id);

  return Response.json(grouped);
}
