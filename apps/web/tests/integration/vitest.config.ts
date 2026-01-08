import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    globalSetup: "./src/setup.ts",
    testTimeout: 30000,
    retry: 1,
    fileParallelism: false, // Run sequentially to avoid race conditions
    exclude: ["**/node_modules/**", "**/dist/**"],
    reporters: [
      "default",
      ["html", { outputFile: "test-results/index.html" }],
      ["json", { outputFile: "test-results/results.json" }],
    ],
  },
});
