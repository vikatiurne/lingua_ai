import { z } from "zod";
import { MATERIAL_TYPE_VALUES } from "@lingua/shared";
import type { CEFRLevel } from "@lingua/shared";
import { completeCached } from "@/lib/ai/cached";
import { logAIRequest } from "@/lib/ai/logger";
import { getPrompt } from "@/lib/ai/prompts/recommend-media";

const AI_TIMEOUT_MS = 15000;
const AI_TEMPERATURE = 0.4;

const mediaRecommendationSchema = z.object({
  title: z.string().min(1),
  type: z.enum(MATERIAL_TYPE_VALUES),
  description: z.string().min(1),
  url: z.string().url(),
});

const mediaRecommendationsResponseSchema = z.array(mediaRecommendationSchema);

export type MediaRecommendation = z.infer<typeof mediaRecommendationSchema>;

type RecommendMediaParams = {
  topicName: string;
  subtopicName?: string | null;
  level: CEFRLevel;
};

export async function recommendMedia(
  params: RecommendMediaParams
): Promise<MediaRecommendation[]> {
  const prompt = getPrompt(params);

  try {
    const result = await completeCached([{ role: "user", content: prompt }], {
      responseFormat: "json",
      temperature: AI_TEMPERATURE,
      timeoutMs: AI_TIMEOUT_MS,
    });

    const parsed = mediaRecommendationsResponseSchema.parse(
      JSON.parse(result.text)
    );

    logAIRequest({
      provider: "recommend-media",
      model: result.model,
      promptLength: prompt.length,
      responseLength: result.text.length,
      latencyMs: result.latencyMs,
    });

    return parsed.slice(0, 3);
  } catch (error) {
    logAIRequest({
      provider: "recommend-media",
      model: "failed",
      promptLength: prompt.length,
      responseLength: 0,
      latencyMs: 0,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
