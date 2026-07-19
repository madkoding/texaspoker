import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();

await page.goto("http://localhost:5173/");
await page.waitForTimeout(1500);
await page.locator('input[placeholder*="Maverick"]').fill("TestPlayer");
await page.getByRole("button", { name: /Entrar al lobby/i }).click();
await page.waitForTimeout(2000);

const createBtn = page.getByRole("button", { name: /Crear sala/i });
if (await createBtn.isVisible()) {
  await createBtn.click();
  await page.waitForTimeout(2000);
}

const botsBtn = page.getByRole("button", { name: /Bots/i }).first();
if (await botsBtn.isVisible()) {
  await botsBtn.click();
  await page.waitForTimeout(2000);
}

const startBtn = page.getByRole("button", { name: /Repartir|Siguiente/i });
if (await startBtn.isVisible()) {
  await startBtn.click();
  await page.waitForTimeout(10000);
}

await page.screenshot({ path: "/tmp/current.png", fullPage: false });
await browser.close();
