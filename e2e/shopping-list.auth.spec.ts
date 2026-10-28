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

test("add, check, uncheck, and delete a shopping-list item", async ({ page }) => {
  test.setTimeout(90_000);
  const itemName = `E2E shopping item ${randomUUID().slice(0, 8)}`;
  let itemId: string | undefined;

  try {
    await page.goto("/nl/shopping-list");
    await expect(
      page.getByRole("heading", { name: "Boodschappenlijst", exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    await page
      .getByRole("textbox", { name: "New shopping list item" })
      .fill(itemName);
    const addResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/shopping-list" &&
        response.request().method() === "POST",
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: "Add item" }).click();
    const addResponse = await addResponsePromise;
    expect(addResponse.status(), "add shopping-list item").toBe(201);
    const addedItem = (await addResponse.json()) as { id: string };
    itemId = addedItem.id;
    await expect(page.getByText(itemName, { exact: true })).toBeVisible();

    const markDoneResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/api/shopping-list/${itemId}` &&
        response.request().method() === "PATCH",
      { timeout: 30_000 },
    );
    await page.getByRole("checkbox", { name: `Mark ${itemName} as done` }).click();
    const markDoneResponse = await markDoneResponsePromise;
    expect(markDoneResponse.status(), "mark item done").toBe(200);
    await expect(
      page.getByRole("checkbox", { name: `Mark ${itemName} as unchecked` }),
    ).toBeVisible();

    const markUndoneResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/api/shopping-list/${itemId}` &&
        response.request().method() === "PATCH",
      { timeout: 30_000 },
    );
    await page
      .getByRole("checkbox", { name: `Mark ${itemName} as unchecked` })
      .click();
    const markUndoneResponse = await markUndoneResponsePromise;
    expect(markUndoneResponse.status(), "mark item not done").toBe(200);
    await expect(
      page.getByRole("checkbox", { name: `Mark ${itemName} as done` }),
    ).toBeVisible();

    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/api/shopping-list/${itemId}` &&
        response.request().method() === "DELETE",
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: `Delete ${itemName}` }).click();
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.status(), "delete shopping-list item").toBe(200);
    await expect(page.getByText(itemName, { exact: true })).toHaveCount(0);
    itemId = undefined;
  } finally {
    // Only remove the uniquely identified row created by this test.
    if (itemId) {
      await page
        .evaluate(async (id) => {
          await fetch(`/api/shopping-list/${id}`, {
            method: "DELETE",
            credentials: "include",
          });
        }, itemId)
        .catch(() => {});
    }
  }
});
