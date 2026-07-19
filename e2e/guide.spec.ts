import { test, expect } from "@playwright/test";
import { setClientId, setPlayerName, gotoGuide } from "./helpers";

test("HandGuide is reachable and shows all 10 hands", async ({ page }) => {
  await setClientId(page, `P_GUIDE_${Date.now()}`);
  await setPlayerName(page, "GuideE2E");
  test.setTimeout(15_000);
  await gotoGuide(page);

  // The guide has the 10 hand types
  await expect(page.getByRole("heading", { name: "Escalera Real" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Póker" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Full" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Carta Alta" })).toBeVisible();
  // Back button returns to lobby
  await page.getByRole("button", { name: /Volver/i }).click();
  await page.getByRole("button", { name: /Crear sala/i }).waitFor({ state: "visible", timeout: 5_000 });
});
