import { config as loadEnv } from "dotenv";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// E2E-specific values override local app defaults. Keep these files ignored.
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env.e2e.local"), override: true });

const defaultPort = process.env.E2E_DATABASE_URL ? 3001 : 3000;
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${defaultPort}`;
const authState = path.resolve(process.cwd(), "playwright/.auth/user.json");

const webServerEnv: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined) {
    webServerEnv[key] = value;
  }
}
webServerEnv.NEXT_PUBLIC_APP_URL = baseURL;
if (process.env.E2E_DATABASE_URL) {
  webServerEnv.DATABASE_URL = process.env.E2E_DATABASE_URL;
}
if (process.env.E2E_NEON_AUTH_BASE_URL) {
  webServerEnv.NEON_AUTH_BASE_URL = process.env.E2E_NEON_AUTH_BASE_URL;
}
if (process.env.E2E_NEON_AUTH_COOKIE_SECRET) {
  webServerEnv.NEON_AUTH_COOKIE_SECRET =
    process.env.E2E_NEON_AUTH_COOKIE_SECRET;
}
if (process.env.E2E_DATABASE_URL) {
  // Recipe deletion constructs ImageService even when a recipe has no image.
  // Default to inert credentials so E2E cannot accidentally touch production R2.
  webServerEnv.R2_ENDPOINT =
    process.env.E2E_R2_ENDPOINT ?? "https://e2e-r2.invalid";
  webServerEnv.R2_ACCESS_KEY_ID =
    process.env.E2E_R2_ACCESS_KEY_ID ?? "e2e-not-used";
  webServerEnv.R2_SECRET_ACCESS_KEY =
    process.env.E2E_R2_SECRET_ACCESS_KEY ?? "e2e-not-used";
  webServerEnv.R2_BUCKET_NAME =
    process.env.E2E_R2_BUCKET_NAME ?? "e2e-not-used";
  webServerEnv.R2_PUBLIC_URL =
    process.env.E2E_R2_PUBLIC_URL ?? "https://e2e-r2.invalid";
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Keep authenticated E2E traffic serial against the shared Preview services;
  // parallel local runs have timed out against Neon Auth/Preview.
  workers:
    process.env.CI || process.env.E2E_DATABASE_URL ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "./test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "public",
      testMatch: "**/*.public.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated",
      testMatch: "**/*.auth.spec.ts",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: authState,
      },
    },
  ],
  ...(process.env.PLAYWRIGHT_BASE_URL
    ? {}
    : {
        webServer: {
          command:
            `node ./node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port ${new URL(baseURL).port || defaultPort}`,
          url: `${baseURL}/nl/`,
          // Never reuse a developer server when authenticated tests target the
          // dedicated E2E database; it may have been started with prod env.
          reuseExistingServer: !process.env.CI && !process.env.E2E_DATABASE_URL,
          timeout: 120_000,
          env: webServerEnv,
        },
      }),
});
