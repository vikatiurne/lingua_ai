import { z } from "zod";

export const saveAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        sentenceId: z.string().trim().min(1),
        userAnswer: z
          .string()
          .trim()
          .min(1, "Відповідь не може бути порожньою"),
      }),
    )
    .min(1),
});

export type SaveAnswersInput = z.infer<typeof saveAnswersSchema>;
