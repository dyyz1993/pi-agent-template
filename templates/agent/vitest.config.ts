import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/mainview/__tests__/setup.ts"],
    include: [
      "src/mainview/**/*.{test,spec}.{ts,tsx}",
      "src/shared/**/*.{test,spec}.{ts,tsx}",
    ],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/mainview/**/*.{ts,tsx}"],
      exclude: [
        "src/mainview/**/types/**",
        "src/mainview/**/*.d.ts",
        "src/mainview/main.tsx",
      ],
    },
  },
  resolve: {
    alias: {
      "@dyyz1993/rpc-core": resolve(
        __dirname,
        "..",
        "..",
        "packages",
        "rpc-core",
        "src",
        "index.ts"
      ),
    },
  },
});
