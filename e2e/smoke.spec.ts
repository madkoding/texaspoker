import { test, expect } from "@playwright/test";

test("smoke: can load lobby", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Texas Poker/);
});
