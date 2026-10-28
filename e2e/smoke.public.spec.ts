import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  await page.goto("/nl/");
  await expect(page).toHaveURL(/\/nl\/?/);
  await expect(page).toHaveTitle(/.+/);
});

test("recipes page sends signed-out visitors to login", async ({ page }) => {
  await page.goto("/nl/recipes");

  await expect(page).toHaveURL(/\/nl\/login(?:\?.*)?$/);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});
