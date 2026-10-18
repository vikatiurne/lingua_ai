import { z } from "zod";
import { CEFR_LEVELS } from "@lingua/shared";

export const topicStatusSchema = z.object({
  level: z.enum(CEFR_LEVELS),
  topicName: z.string().min(1),
  status: z.enum(["mastered", "not_started"]),
});

export type TopicStatusInput = z.infer<typeof topicStatusSchema>;
