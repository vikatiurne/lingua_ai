import { z } from "zod";

export const saveAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        sentenceId: z.string(),
        userAnswer: z.string(),
      }),
    )
    .min(1),
});

export type SaveAnswersInput = z.infer<typeof saveAnswersSchema>;
