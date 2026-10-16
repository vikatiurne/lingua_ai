import { z } from "zod";
import { CEFR_LEVELS } from "@lingua/shared";

export const updateUserSchema = z.object({
  level: z.enum(CEFR_LEVELS).optional(),
  targetLevel: z.enum(CEFR_LEVELS).optional(),
  dailyMinutes: z.number().int().min(5).max(240).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
