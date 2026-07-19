import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors metro.config.js: @/ -> ../web (shared pure modules).
      "@": path.resolve(__dirname, "../web"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
