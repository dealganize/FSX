import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "evals/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000, // PGlite start-up + fixture seeding can be slow on a cold machine
  },
});
