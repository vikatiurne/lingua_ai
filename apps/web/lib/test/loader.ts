import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CEFRLevel } from "@lingua/shared";

export type TestSet = 1 | 2;

export type TestQuestion = {
  id: string;
  level: CEFRLevel;
  set: TestSet;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
};

function resolveDataDir(): string {
  const envDir = process.env.DATA_DIR;
  if (envDir && envDir.trim().length > 0) {
    return envDir;
  }
  const currentFile = fileURLToPath(import.meta.url);
  return join(dirname(currentFile), "../../../../data");
}

const DATA_DIR = resolveDataDir();

export function loadTestQuestions(): TestQuestion[] {
  const filePath = join(DATA_DIR, "test_questions.json");
  const content = readFileSync(filePath, "utf-8");
  const data = JSON.parse(content) as { questions: TestQuestion[] };
  return data.questions;
}
