import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
// import eslint from "vite-plugin-eslint";
import checker from "vite-plugin-checker";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [
    react(),
    // eslint({
    //   fix: process.env.ESLINT_FIX?.toLowerCase() === "true",
    // }),
    !process.env.VITEST
      ? checker({
          overlay: {
            initialIsOpen: false,
          },
          typescript: true,
          eslint: {
            // for example, lint .ts and .tsx
            lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
          },
        })
      : undefined,
  ],
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
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
