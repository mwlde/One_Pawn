import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests only, for the pure logic in lib/. No jsdom and no browser mode:
// nothing under test touches the DOM. UI smoke tests and end-to-end coverage
// arrive with Playwright later, per CLAUDE.md's testing section.
//
// .mts rather than .ts so Vite loads it as a real ES module. As plain .ts it is
// loaded as CommonJS and every ESM feature in here draws a deprecation warning.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    // Mirrors the "@/*" path mapping in tsconfig.json. Set by hand rather than
    // read out of tsconfig, which would need another dependency to do.
    alias: { "@": resolve(import.meta.dirname, ".") },
  },
});
