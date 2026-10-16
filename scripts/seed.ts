import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LEVEL_META } from "@lingua/shared";
import { parseAllTemplates } from "./lib/parse-templates.js";
import { create, findOne } from "./lib/strapi-client.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

type Level = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  order?: number | null;
};

type Topic = {
  id: number;
  name: string;
  order?: number | null;
  level?: { id: number } | number;
};

type Subtopic = {
  id: number;
  name: string;
  order?: number | null;
  topic?: { id: number } | number;
};

async function seedLevels(): Promise<Map<string, Level>> {
  const levelsMap = new Map<string, Level>();

  for (const [code, meta] of Object.entries(LEVEL_META)) {
    const existing = await findOne<Level>("levels", {
      code: { $eq: code },
    });

    if (existing) {
      console.log(`[level] ${code} already exists (id=${existing.id})`);
      levelsMap.set(code, existing);
      continue;
    }

    const created = await create<Level>("levels", {
      code,
      name: meta.name,
      description: meta.description,
      order: meta.order,
    });

    console.log(`[level] created ${code} (id=${created.id})`);
    levelsMap.set(code, created);
  }

  return levelsMap;
}

async function seedTopicsAndSubtopics(levels: Map<string, Level>): Promise<void> {
  const parsed = await parseAllTemplates(resolve(repoRoot, "data"));

  for (const file of parsed) {
    const level = levels.get(file.level);
    if (!level) {
      console.warn(`[warn] Level ${file.level} not found in Strapi, skipping`);
      continue;
    }

    let topicOrder = 1;
    for (const topic of file.topics) {
      const existingTopic = await findOne<Topic>("topics", {
        name: { $eq: topic.name },
        level: { id: { $eq: level.id } },
      });

      let topicId: number;

      if (existingTopic) {
        console.log(`[topic] ${level.code} / ${topic.name} exists (id=${existingTopic.id})`);
        topicId = existingTopic.id;
      } else {
        const createdTopic = await create<Topic>("topics", {
          name: topic.name,
          order: topicOrder,
          level: level.id,
        });
        console.log(
          `[topic] ${level.code} / ${topic.name} created (id=${createdTopic.id})`
        );
        topicId = createdTopic.id;
      }

      let subtopicOrder = 1;
      for (const subtopic of topic.subtopics) {
        const existingSubtopic = await findOne<Subtopic>("subtopics", {
          name: { $eq: subtopic.name },
          topic: { id: { $eq: topicId } },
        });

        if (existingSubtopic) {
          console.log(`  [subtopic] ${subtopic.name} exists (id=${existingSubtopic.id})`);
        } else {
          const createdSubtopic = await create<Subtopic>("subtopics", {
            name: subtopic.name,
            order: subtopicOrder,
            topic: topicId,
          });
          console.log(
            `  [subtopic] ${subtopic.name} created (id=${createdSubtopic.id})`
          );
        }
        subtopicOrder += 1;
      }
      topicOrder += 1;
    }
  }
}

async function main(): Promise<void> {
  try {
    console.log("🌱 Starting seed...");
    const levels = await seedLevels();
    await seedTopicsAndSubtopics(levels);
    console.log("✅ Seed completed successfully");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

main();
