import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

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

test.skip(
  missingEnvironment.length > 0,
  `Authenticated E2E requires: ${missingEnvironment.join(", ")}`,
);

test("create, edit, and delete a recipe through the UI", async ({ page }) => {
  test.setTimeout(90_000);
  const initialTitle = `E2E Appeltaart ${randomUUID().slice(0, 8)}`;
  const updatedTitle = `${initialTitle} bijgewerkt`;
  let recipeId: string | undefined;

  try {
    await page.goto("/nl/recipes/add");

    const createRequests: string[] = [];
    page.on("request", (request) => {
      if (
        new URL(request.url()).pathname === "/api/recipes" &&
        request.method() === "POST"
      ) {
        createRequests.push(request.url());
      }
    });
    await page
      .getByRole("button", { name: "Recept Aanmaken", exact: true })
      .click();
    const validationAlert = page.locator('[data-slot="alert"][role="alert"]');
    await expect(validationAlert).toContainText(
      "Je recept heeft een naam nodig",
    );
    await expect(validationAlert).toContainText(
      "Een beschrijving helpt je herinneren",
    );
    await expect(validationAlert).toContainText(
      "Sommige ingrediënten missen hun naam",
    );
    expect(createRequests, "invalid form must not be submitted").toHaveLength(0);

    await page.getByLabel("Titel", { exact: true }).fill(initialTitle);
    await page
      .getByPlaceholder("Ingrediënt naam", { exact: true })
      .fill("appels");
    await page
      .locator("#description")
      .fill("Schil de appels, meng de ingrediënten en bak goudbruin.");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/recipes" &&
        response.request().method() === "POST",
      { timeout: 60_000 },
    );
    await page
      .getByRole("button", { name: "Recept Aanmaken", exact: true })
      .click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status(), "create recipe API response").toBe(201);
    await expect(page).toHaveURL(/\/nl\/recipes\/[0-9a-f-]{36}$/i, {
      timeout: 30_000,
    });

    recipeId = page.url().match(/\/recipes\/([0-9a-f-]{36})$/i)?.[1];
    expect(recipeId, "the saved recipe URL should contain its id").toBeTruthy();
    await expect(
      page.getByRole("main").getByText(initialTitle, { exact: true }).last(),
    ).toBeVisible({ timeout: 30_000 });

    await page
      .getByRole("main")
      .getByRole("button", { name: "Bewerken", exact: true })
      .first()
      .click();
    await page.getByLabel("Titel", { exact: true }).fill(updatedTitle);
    await page
      .getByRole("button", { name: "Wijzigingen Opslaan", exact: true })
      .click();

    await expect(page).toHaveURL(/\/nl\/recipes\/[0-9a-f-]{36}$/i, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("main").getByText(updatedTitle, { exact: true }).last(),
    ).toBeVisible({ timeout: 30_000 });

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Verwijderen", exact: true }).click();
    await expect(page).toHaveURL(/\/nl\/recipes\/?$/, { timeout: 30_000 });
    await expect(page.getByText(updatedTitle, { exact: true })).toHaveCount(0);
  } finally {
    // UI deletion is the assertion; this API cleanup protects the test account
    // from leftovers if an earlier assertion or navigation fails.
    if (recipeId) {
      await page
        .evaluate(async (id) => {
          await fetch(`/api/recipes/${id}`, {
            method: "DELETE",
            credentials: "include",
          });
        }, recipeId)
        .catch(() => {});
    }
  }
});

test("search and filter recipes", async ({ page }) => {
  test.setTimeout(75_000);
  const appeltaartTitle = "E2E Voorbeeld - Appeltaart";
  const tomatensoepTitle = "E2E Voorbeeld - Tomatensoep";
  const pannenkoekenTitle = "E2E Voorbeeld - Pannenkoeken";

  await page.goto("/nl/recipes");
  const appeltaart = page.getByText(appeltaartTitle, { exact: true });
  const tomatensoep = page.getByText(tomatensoepTitle, { exact: true });
  const pannenkoeken = page.getByText(pannenkoekenTitle, { exact: true });

  await expect(appeltaart).toBeVisible({ timeout: 30_000 });
  await expect(tomatensoep).toBeVisible({ timeout: 30_000 });
  await expect(pannenkoeken).toBeVisible({ timeout: 30_000 });

  const search = page.getByPlaceholder("Zoek recepten...", { exact: true });
  await search.fill(appeltaartTitle);
  await expect(appeltaart).toBeVisible();
  await expect(tomatensoep).toHaveCount(0);
  await expect(pannenkoeken).toHaveCount(0);

  await search.clear();
  await expect(tomatensoep).toBeVisible();
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Nagerecht", exact: true }).click();

  await expect(appeltaart).toBeVisible();
  await expect(tomatensoep).toHaveCount(0);
  await expect(pannenkoeken).toHaveCount(0);

  await page.getByRole("button", { name: "Wissen", exact: true }).click();
  await expect(tomatensoep).toBeVisible();
  await expect(pannenkoeken).toBeVisible();
});
