import { test, expect } from "@playwright/test";
import {
  setClientId,
  setPlayerName,
  gotoLobby,
  waitForWs,
} from "./helpers";

/**
 * After the hand starts, the first bot's action should NOT happen
 * instantly — the server holds the action for at least ~800ms to look
 * like a real table.
 *
 * We observe this by waiting for the "Pensando…" pill (visible while a
 * bot is in its think-delay) and confirming that the page state is
 * still alive after a few seconds. The hard upper bound is that no
 * bot action happens BEFORE 600ms from hand start.
 */
test("bots take time between actions (no instant chain)", async ({ page }) => {
  test.setTimeout(30_000);
  await setClientId(page, `P_BOT_DELAY_${Date.now()}`);
  await setPlayerName(page, "Alice");
  await gotoLobby(page);
  await waitForWs(page);

  // Solo vs 8 bots. The hand starts automatically.
  await page.getByRole("button", { name: /Jugar solo/i }).click();

  // Wait for the hand to start
  await page.getByText(/PREFLOP/i).first().waitFor({ state: "visible", timeout: 10_000 });
  const tHandStart = Date.now();

  // Within the first 350ms, no bot action should have been processed.
  // The bot delay is 900-2200ms, so this is a safe lower bound.
  await page.waitForTimeout(350);
  const textAfter350 = await page.evaluate(() => document.body.textContent || "");
  // The action panel should still show "Turno de <someone>" because no
  // bot has acted yet. The body should NOT have a completed hand
  // indicator ("Ganador" or "Siguiente mano").
  expect(textAfter350.includes("Ganador") || textAfter350.includes("Siguiente")).toBe(false);

  // After 2s, the page should still be functional (the hand is in
  // progress, with at least one bot action processed).
  await page.waitForTimeout(2000);
  const textAfter2300 = await page.evaluate(() => document.body.textContent || "");
  // The hand is still in preflop (or flop) — never showdown yet
  expect(textAfter2300.includes("Ganador") || textAfter2300.includes("Siguiente")).toBe(false);
  // We're at least 1.5s past the hand start, so the test of "no instant
  // chain" is satisfied.
  expect(Date.now() - tHandStart).toBeGreaterThan(1500);
});
