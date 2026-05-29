import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@/lib/db/schema": resolve(__dirname, "./src/lib/db/schema"),
      "@/lib/db/blocks-schema": resolve(__dirname, "./src/lib/db/blocks-schema"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    setupFiles: [],
    testTimeout: 10000,
  },
});
