import { readFile } from "node:fs/promises";
import { join } from "node:path";

// ---------- налаштування ----------
const DATA_DIR = "./data";
const SLOT_LEVEL = "intermediate";
const TEMPLATE_FILE = "templates_b1_advanced.json";
const SLOTS_FILE = "slots_b1.json";
const NOUNS_FILE = "slots_nouns_b1.json";
const INCLUDE_OPTIONAL_CHANCE = 0.7; // 70% шанс включити optional

// ---------- утиліти ----------
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function readJson(file) {
  const raw = await readFile(join(DATA_DIR, file), "utf-8");
  return JSON.parse(raw);
}

// ---------- $ref resolver ----------
const REF_PATTERN = /^(slots(?:_nouns)?_[a-z0-9_]+)#\/(.+)$/;

function parseRef(ref) {
  const m = REF_PATTERN.exec(ref);
  if (!m) throw new Error(`Invalid $ref: ${ref}`);
  return { file: m[1], path: m[2].split("/").filter(Boolean) };
}

function getByPath(obj, path) {
  let cur = obj;
  for (const seg of path) {
    if (cur == null || typeof cur !== "object") {
      throw new Error(`Path not found at "${seg}" (${path.join("/")})`);
    }
    cur = cur[seg];
  }
  return cur;
}

function pickLevel(value, level) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return value[level] ?? value.intermediate ?? value.basic;
  }
  throw new Error("Unsupported slot format");
}

function makeResolver(files) {
  return function resolveRef(ref, level) {
    const { file, path } = parseRef(ref);
    const root = files[file];
    if (!root) throw new Error(`Unknown file in $ref: ${file}`);
    const value = getByPath(root, path);
    return pickLevel(value, level);
  };
}

// ---------- заповнення шаблону ----------
function fillPattern(pattern, resolvedSlots) {
  // 1. Прибираємо нотаційні "+" (розділювачі)
  let cleaned = pattern.replace(/\s*\+\s*/g, " ");

  // 2. Замінюємо [X] та [optional: X]
  cleaned = cleaned.replace(/\[([^\]]+)\]/g, (match, inner) => {
    if (inner.startsWith("optional:")) {
      const actual = inner.replace("optional:", "").trim();
      if (Math.random() > INCLUDE_OPTIONAL_CHANCE) return "";
      const values = resolvedSlots[actual];
      return values ? pick(values) : "";
    }
    const values = resolvedSlots[inner];
    return values ? pick(values) : match;
  });

  // 3. Нормалізуємо пробіли
  cleaned = cleaned
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();

  // 4. Capitalize перша літера
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  // 5. Додаємо крапку, якщо немає
  if (!/[.!?]$/.test(cleaned)) cleaned += ".";

  return cleaned;
}

// ---------- main ----------
async function main() {
  console.log("Reading files...");
  const [templates, slots, nouns] = await Promise.all([
    readJson(TEMPLATE_FILE),
    readJson(SLOTS_FILE),
    readJson(NOUNS_FILE),
  ]);

  const files = {
    [SLOTS_FILE.replace(".json", "")]: slots,
    [NOUNS_FILE.replace(".json", "")]: nouns,
  };

  const resolveRef = makeResolver(files);

  const topic = templates.topics[0];
  const subtopic = topic.subtopics[0];
  const pattern = subtopic.patterns[0];

  console.log(`\nTemplate: ${pattern.id} — ${topic.topic} / ${subtopic.name}`);
  console.log(`Pattern: ${pattern.pattern}\n`);

  const resolvedSlots = {};
  for (const [key, entry] of Object.entries(pattern.slots)) {
    if (entry && typeof entry === "object" && "$ref" in entry) {
      resolvedSlots[key] = resolveRef(entry.$ref, SLOT_LEVEL);
      console.log(`  ${key}: ${resolvedSlots[key].length} values`);
    } else if (Array.isArray(entry)) {
      resolvedSlots[key] = entry;
    } else if (entry && typeof entry === "object") {
      resolvedSlots[key] = pickLevel(entry, SLOT_LEVEL);
    }
  }

  console.log("\nGenerated sentences:\n");
  for (let i = 1; i <= 5; i++) {
    const sentence = fillPattern(pattern.pattern, resolvedSlots);
    console.log(`${i}. ${sentence}`);
  }
}

main().catch((err) => {
  console.error("\n❌ Failed:", err.message);
  process.exit(1);
});