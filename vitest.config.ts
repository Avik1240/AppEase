import { defineConfig } from "vitest/config";

export default defineConfig({
  // Tests are plain TS units — nothing here imports CSS. Vite otherwise
  // auto-discovers postcss.config.mjs at the project root, whose
  // `plugins: ["@tailwindcss/postcss"]` shorthand is Next.js-specific
  // syntax that a generic postcss-load-config (as used by Vite/Vitest)
  // can't parse, crashing config resolution before any test runs. Giving
  // Vite an explicit (empty) postcss config here skips that auto-search.
  css: {
    postcss: { plugins: [] },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
