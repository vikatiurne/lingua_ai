import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["lib/**/*.test.ts", "lib/**/*.spec.ts"],
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      "@lingua/shared": resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
    conditions: ["node", "import", "module"],
  },
});
