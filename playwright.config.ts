import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a production build on recorded fixtures: an embedded PGlite database seeded
 * from fixtures/, Sleeper calls served from fixtures, and no Anthropic key (tutor offline).
 * No network access is needed.
 */
const PORT = 3100;
const env = {
  DATABASE_URL: "",
  PGLITE_DIR: ".data/e2e",
  FSX_SLEEPER_FIXTURES: "1",
  ANTHROPIC_API_KEY: "",
  NEXT_PUBLIC_DEMO_SLEEPER_USER: "johnrog",
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: /@mobile/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    command: `npx tsx scripts/snapshot.ts --fixtures --date=2026-11-10 && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 120_000,
    reuseExistingServer: false,
    env,
  },
});
