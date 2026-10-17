import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  CEFRLevel,
  SlotFile,
  SlotNounsFile,
  TemplateFile,
} from "@lingua/shared";
import { LEVEL_FILES } from "./level-files";

function resolveDataDir(): string {
  const envDir = process.env.DATA_DIR;
  if (envDir && envDir.trim().length > 0) {
    return envDir;
  }
  // Resolve <root>/data from apps/web/lib/slots/loader.ts
  const currentFile = fileURLToPath(import.meta.url);
  return join(dirname(currentFile), "../../../../data");
}

const DATA_DIR = resolveDataDir();

const slotCache = new Map<CEFRLevel, SlotFile>();
const nounsCache = new Map<CEFRLevel, SlotNounsFile>();
const templateCache = new Map<CEFRLevel, TemplateFile>();

export async function loadSlotFile(level: CEFRLevel): Promise<SlotFile> {
  const cached = slotCache.get(level);
  if (cached) {
    return cached;
  }
  const filename = LEVEL_FILES[level].slots;
  const filePath = join(DATA_DIR, filename);
  const content = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(content) as SlotFile;
  slotCache.set(level, parsed);
  return parsed;
}

export async function loadNounsFile(level: CEFRLevel): Promise<SlotNounsFile> {
  const cached = nounsCache.get(level);
  if (cached) {
    return cached;
  }
  const filename = LEVEL_FILES[level].nouns;
  const filePath = join(DATA_DIR, filename);
  const content = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(content) as SlotNounsFile;
  nounsCache.set(level, parsed);
  return parsed;
}

export async function loadTemplateFile(level: CEFRLevel): Promise<TemplateFile> {
  const cached = templateCache.get(level);
  if (cached) {
    return cached;
  }
  const filename = LEVEL_FILES[level].templates;
  const filePath = join(DATA_DIR, filename);
  const content = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(content) as TemplateFile;
  templateCache.set(level, parsed);
  return parsed;
}

export function clearSlotCache(): void {
  slotCache.clear();
  nounsCache.clear();
  templateCache.clear();
}
