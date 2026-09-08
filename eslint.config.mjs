import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cloudflare adapter build output and wrangler's dev scratch space.
    // Generated bundles, not ours to fix.
    ".open-next/**",
    ".wrangler/**",
    // Emscripten-generated glue. Build artifact, not ours to fix.
    "public/engine.js",
    // Exported design canvases. Vendored assets we read, not code we own.
    "Chess engine wireframes phase 1/**",
    "wireframes2.0/**",
  ]),
]);

export default eslintConfig;
