import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  await page.goto("/nl/");
  await expect(page).toHaveURL(/\/nl\/?/);
  await expect(page).toHaveTitle(/.+/); // page has any non-empty title
});
