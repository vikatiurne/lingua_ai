import { z } from "zod";
import { CEFR_LEVELS } from "@lingua/shared";

export const testSubmissionSchema = z.object({
  level: z.enum(CEFR_LEVELS),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        correct: z.boolean(),
      }),
    )
    .min(5)
    .max(30),
  correctCount: z.number().int().min(0),
  totalCount: z.number().int().min(5).max(30),
});

export type TestSubmissionInput = z.infer<typeof testSubmissionSchema>;
