import { z } from "zod";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { markVocabularyLearned } from "@/lib/vocabulary/vocabulary";

const markLearnedSchema = z.object({
  date: z.string().min(1),
  words: z.array(z.string().min(1)).optional(),
});

export async function PATCH(req: NextRequest): Promise<Response> {
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

  const parsed = markLearnedSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const updated = await markVocabularyLearned(user.id, parsed.data);
    return Response.json({ success: true, updated });
  } catch {
    return Response.json(
      { error: "Failed to update vocabulary" },
      { status: 500 }
    );
  }
}
