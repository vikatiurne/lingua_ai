import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Невірний email"),
  password: z
    .string()
    .min(8, "Мінімум 8 символів")
    .max(72, "Максимум 72 символи"),
  name: z.string().min(1, "Введіть ім'я").max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Невірний email"),
  password: z.string().min(1, "Введіть пароль"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
