import { NoPlanCTA } from "@/components/dashboard/no-plan-cta";
import { PlanTimeline } from "@/components/plan/plan-timeline";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import type { PlanContent } from "@/lib/plan/generate";

export default async function PlanPage() {
  const user = await requireUser();

  const plan = await prisma.plan.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!plan || user.level === null) {
    return <NoPlanCTA />;
  }

  const progress = await prisma.topicProgress.findMany({
    where: { userId: user.id, level: user.level },
    select: { topicName: true, status: true },
  });

  return (
    <PlanTimeline
      content={plan.content as unknown as PlanContent}
      progress={progress}
      user={user}
    />
  );
}
