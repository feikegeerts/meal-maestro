import { expect, test as setup } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { sampleRecipes } from "./fixtures/sample-recipes";

const authFile = path.resolve(process.cwd(), "playwright/.auth/user.json");
const requiredEnvironment = [
  "TEST_USER_EMAIL",
  "TEST_USER_PASSWORD",
  "E2E_DATABASE_URL",
  "E2E_NEON_AUTH_BASE_URL",
  "E2E_NEON_AUTH_COOKIE_SECRET",
] as const;

const missingEnvironment = requiredEnvironment.filter(
  (key) => !process.env[key],
);

setup("sign in to the isolated E2E account", async ({ page }) => {
  setup.setTimeout(90_000);
  if (process.env.CI && missingEnvironment.length > 0) {
    throw new Error(
      `E2E is enabled in CI but required environment variables are missing: ${missingEnvironment.join(", ")}`,
    );
  }

  setup.skip(
    missingEnvironment.length > 0,
    `Authenticated E2E requires: ${missingEnvironment.join(", ")}`,
  );

  await page.goto("/nl/login");
  await page.locator('input[type="email"]').fill(process.env.TEST_USER_EMAIL!);
  await page
    .locator('input[type="password"]')
    .fill(process.env.TEST_USER_PASSWORD!);
  await page
    .getByRole("main")
    .getByRole("button", { name: "Inloggen", exact: true })
    .click();

  await expect(page).toHaveURL(/\/nl\/recipes\/?(?:\?.*)?$/, {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("button", { name: "Recept Toevoegen", exact: true }),
  ).toBeVisible();

  const existingResult = await page.evaluate(async () => {
    const response = await fetch("/api/recipes?query=E2E%20Voorbeeld", {
      credentials: "include",
    });
    const payload = (await response.json().catch(() => null)) as {
      recipes?: Array<{ title: string }>;
    } | null;
    return { status: response.status, payload };
  });
  expect(
    existingResult.status,
    `load existing E2E fixtures (HTTP ${existingResult.status})`,
  ).toBe(200);
  const existingTitles = new Set(
    (existingResult.payload?.recipes ?? []).map((recipe) => recipe.title),
  );

  for (const recipe of sampleRecipes) {
    if (existingTitles.has(recipe.title)) continue;

    const status = await page.evaluate(async (recipeData) => {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(recipeData),
      });
      return response.status;
    }, recipe);
    expect(status, `seed ${recipe.title} (HTTP ${status})`).toBe(201);
  }

  await mkdir(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
