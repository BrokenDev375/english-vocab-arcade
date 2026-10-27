import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = readFileSync("vitest.integration.config.mts", "utf8");
const [anon, service] = [...fixture.matchAll(/"(eyJ[^"\r\n]+)"/g)].map(match => match[1]);
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1, timeout: 45000, expect: { timeout: 12000 }, retries: 0,
  use: { baseURL: "http://127.0.0.1:3197", headless: true, channel: process.env.E2E_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined), trace: "retain-on-failure" },
  reporter: "list",
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3197", url: "http://127.0.0.1:3197/api/health", reuseExistingServer: false,
    env: { NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3197", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anon, SUPABASE_SECRET_KEY: service, APP_ENV: "test", AI_ENABLED: "true", GEMINI_API_KEY: "", DEMO_MODE: "false" },
  },
});
