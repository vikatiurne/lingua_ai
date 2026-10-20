import Link from "next/link";

import { LevelBadge } from "@/components/dashboard/level-badge";
import { NoLevelCTA } from "@/components/dashboard/no-level-cta";
import { NoPlanCTA } from "@/components/dashboard/no-plan-cta";
import { PlanPreview } from "@/components/dashboard/plan-preview";
import { WeakTopicsCard } from "@/components/dashboard/weak-topics-card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import type { PlanContent } from "@/lib/plan/generate";

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.level === null) {
    return <NoLevelCTA />;
  }

  const activePlan = await prisma.plan.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!activePlan) {
    return (
      <div className="space-y-6">
        <LevelBadge level={user.level} />
        <NoPlanCTA />
        <p className="text-center text-sm text-muted-foreground">
          Хочете обрати тему самостійно?{" "}
          <Link
            href="/library"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            → Бібліотека
          </Link>
        </p>
      </div>
    );
  }

  const weakTopics = await prisma.topicProgress.findMany({
    where: { userId: user.id, status: "not_started" },
  });

  const content = activePlan.content as unknown as PlanContent;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LevelBadge level={user.level} />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/plan">Переглянути весь план</Link>
          </Button>
          <Button asChild>
            <Link href="/exercises">Почати вправу</Link>
          </Button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <PlanPreview content={content} targetLevel={user.targetLevel} />
        <WeakTopicsCard topics={weakTopics} />
      </div>
      <p className="text-sm text-muted-foreground">
        Хочете обрати тему самостійно?{" "}
        <Link
          href="/library"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          → Бібліотека
        </Link>
      </p>
    </div>
  );
}
