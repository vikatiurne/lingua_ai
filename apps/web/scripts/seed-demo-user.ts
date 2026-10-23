/**
 * Creates (or refreshes) a demo user with an active learning plan.
 *
 * The plan is generated from the local JSON templates, so no AI provider or
 * Strapi instance is required.
 *
 * Usage:
 *   pnpm --filter web seed:demo
 *
 * Optional overrides:
 *   DEMO_EMAIL, DEMO_PASSWORD, DEMO_NAME, DEMO_LEVEL
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  CEFR_LEVEL,
  CEFR_LEVELS,
  type CEFRLevel,
} from "@lingua/shared";
import { generatePlanContent } from "../lib/plan/generate";

const prisma = new PrismaClient();

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "user@example.com";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "secret123";
const DEMO_NAME = process.env.DEMO_NAME ?? "Demo User";

function parseLevel(value: string): CEFRLevel {
  if ((CEFR_LEVELS as string[]).includes(value)) {
    return value as CEFRLevel;
  }
  throw new Error(
    `Unknown level "${value}". Expected one of: ${CEFR_LEVELS.join(", ")}`
  );
}

async function main(): Promise<void> {
  const level = parseLevel(process.env.DEMO_LEVEL ?? CEFR_LEVEL.B1);
  const targetLevel =
    CEFR_LEVELS[CEFR_LEVELS.indexOf(level) + 1] ?? level;
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: {
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      passwordHash,
      level,
      targetLevel,
    },
    update: {
      name: DEMO_NAME,
      passwordHash,
      level,
      targetLevel,
    },
  });

  const content = await generatePlanContent(level, []);

  const plan = await prisma.$transaction(async (tx) => {
    const existing = await tx.plan.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (existing) {
      return tx.plan.update({
        where: { id: existing.id },
        data: { level, content },
      });
    }

    return tx.plan.create({
      data: { userId: user.id, level, content, isActive: true },
    });
  });

  console.log(`[demo] user: ${user.email} (${user.id})`);
  console.log(`[demo] level: ${level} -> ${targetLevel}`);
  console.log(`[demo] plan: ${plan.id} (${content.topics.length} topics)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
