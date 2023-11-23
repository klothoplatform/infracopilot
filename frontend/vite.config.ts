import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
const config = defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [
      ["**/*.spec.tsx", "jsdom"],
      ["**/*.spec.ts", "node"],
    ],
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    includeSource: ["src/**/*.ts"],
    globals: true,
    setupFiles: "./setupTest.ts",
  },
  define: {
    "import.meta.vitest": true,
  },
});

module.exports = config;
