import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

config({
  path: resolve(repoRoot, "apps/web/.env"),
});

export { completeWithFallback } from "../../apps/web/lib/ai/fallback";
export type {
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
} from "../../apps/web/lib/ai/types";
