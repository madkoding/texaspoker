import { test, expect } from "@playwright/test";
import { createRoom, playVsBots } from "./helpers";

/**
 * Verify the table scales correctly when the window is resized. The table
 * is rendered inside a TableFrame that uses ResizeObserver to fit the
 * available space and `transform: scale()` to keep all elements (cards,
 * chips, seats, betting tray) in proportion.
 */
test("table resizes correctly across viewports", async ({ browser }) => {
  test.setTimeout(60_000);

  // Use a context that we can resize
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  await createRoom(page, "Sizer");
  await playVsBots(page);

  // The table wrapper has the shadow-table class
  const table = page.locator(".shadow-table").first();
  await expect(table).toBeVisible();

  // 1) Default (1280x800) — record the table size
  const sizeAt1280 = await table.boundingBox();
  expect(sizeAt1280).not.toBeNull();
  console.log("table @ 1280x800:", sizeAt1280);

  // 2) Resize to a smaller window and verify the table shrinks but keeps
  //    the 16:10 aspect ratio.
  await page.setViewportSize({ width: 900, height: 700 });
  await page.waitForTimeout(200);
  const sizeAt900 = await table.boundingBox();
  console.log("table @ 900x700:", sizeAt900);
  expect(sizeAt900).not.toBeNull();
  expect(sizeAt900!.width).toBeLessThan(sizeAt1280!.width);
  const ratio900 = sizeAt900!.width / sizeAt900!.height;
  expect(ratio900).toBeGreaterThan(1.5);
  expect(ratio900).toBeLessThan(1.7);

  // 3) Resize to a very short window (height-limited) and verify the
  //    table shrinks in height to fit.
  await page.setViewportSize({ width: 1200, height: 500 });
  await page.waitForTimeout(200);
  const sizeAt1200x500 = await table.boundingBox();
  console.log("table @ 1200x500:", sizeAt1200x500);
  expect(sizeAt1200x500).not.toBeNull();
  expect(sizeAt1200x500!.height).toBeLessThan(500);

  // 4) Resize to a very wide window and verify the table caps at the design width.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(200);
  const sizeAt1920 = await table.boundingBox();
  console.log("table @ 1920x1080:", sizeAt1920);
  expect(sizeAt1920).not.toBeNull();
  expect(sizeAt1920!.width).toBeLessThanOrEqual(960 + 2); // 2px tolerance

  // 5) Verify the community cards, betting tray and seats are still visible
  //    at the final size.
  await expect(page.locator(".shadow-table .felt-pattern").first()).toBeVisible();

  await ctx.close();
});
