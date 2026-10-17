import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { PlanContent } from "./generate";

export async function savePlan(
  userId: string,
  content: PlanContent
): Promise<Plan> {
  return prisma.$transaction(async (tx) => {
    await tx.plan.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
    return tx.plan.create({
      data: {
        userId,
        level: content.level,
        content,
        isActive: true,
      },
    });
  });
}
