import { test, expect, Browser, BrowserContext } from "@playwright/test";
import {
  setClientId,
  setPlayerName,
  gotoLobby,
  createRoom,
  joinRoomByCode,
  clickAction,
  getRoomId,
  waitForWs,
} from "./helpers";

/**
 * Two clients in two browser contexts (separate localStorage). One creates
 * a room, the other joins by code. Alice folds preflop and Bob wins.
 */
test("two players: create + join + fold + showdown", async ({ browser }) => {
  test.setTimeout(45_000);

  const ctxAlice = await browser.newContext();
  const ctxBob = await browser.newContext();
  const pageAlice = await ctxAlice.newPage();
  const pageBob = await ctxBob.newPage();

  // Unique ids to avoid collisions
  const aliceId = `P_Alice_${Date.now()}`;
  const bobId = `P_Bob_${Date.now()}`;
  await setClientId(pageAlice, aliceId);
  await setClientId(pageBob, bobId);
  await setPlayerName(pageAlice, "Alice");
  await setPlayerName(pageBob, "Bob");

  // Alice creates
  await createRoom(pageAlice, "Alice");
  const roomId = await getRoomId(pageAlice);

  // Bob joins
  await gotoLobby(pageBob);
  await waitForWs(pageBob);
  await joinRoomByCode(pageBob, roomId);

  // Bob should now be in the same room — header shows same roomId
  const bobHeader = await pageBob.locator("header").first().textContent();
  expect(bobHeader).toContain(roomId);

  // Both clients should see 2 players
  await expect(pageAlice.getByText("Bob", { exact: true })).toBeVisible({ timeout: 5_000 });
  await expect(pageBob.getByText("Alice", { exact: true })).toBeVisible({ timeout: 5_000 });

  // Either Alice or Bob is the dealer (first hand: 0). Either way, start the hand.
  // We need someone to click "Repartir mano" — Alice is the creator so she sees the button.
  // Wait for the "Repartir mano" button (only Alice sees it because she has the dealer button on first hand).
  // Actually anyone with >= 2 players sees it. Either one works.
  const repartir = pageAlice.getByRole("button", { name: /Repartir/i });
  await repartir.click();

  // Wait for the hand to be in preflop
  await pageAlice.getByText(/PREFLOP · MANO #1/i).first().waitFor({ state: "visible", timeout: 10_000 });

  // Find who is on turn and have them fold. For simplicity: have BOTH fold via whichever client is up.
  // We'll loop a few times: check whose turn, fold as that player, until showdown.
  let safety = 8;
  while (safety-- > 0) {
    const aliceState = await pageAlice.evaluate(() => document.body.textContent || "");
    const bobState = await pageBob.evaluate(() => document.body.textContent || "");
    // Showdown ends with a winners panel
    if (aliceState.includes("Ganador") || aliceState.includes("Ganadores") ||
        bobState.includes("Ganador") || bobState.includes("Ganadores")) {
      break;
    }
    // Check Alice's turn first
    const aliceTurn = await pageAlice.evaluate(() => {
      // The turn indicator is the ring class on a PlayerSeat; we use the log instead
      return (document.body.textContent || "").includes("turno de Alice") ||
             (document.body.textContent || "").match(/turno de\s+Alice/i) !== null;
    });
    if (aliceTurn) {
      // Alice folds
      await clickAction(pageAlice, "Retirarse");
      continue;
    }
    // Bob's turn
    const bobTurn = await pageBob.evaluate(() => {
      return (document.body.textContent || "").match(/turno de\s+Bob/i) !== null;
    });
    if (bobTurn) {
      await clickAction(pageBob, "Retirarse");
      continue;
    }
    // Otherwise, neither says "turno de X" — could be that turn indicator is only
    // on the action panel. Fall back to checking the action button presence.
    const aliceActionVisible = await pageAlice.getByRole("button", { name: /Retirarse/i }).isVisible().catch(() => false);
    const bobActionVisible = await pageBob.getByRole("button", { name: /Retirarse/i }).isVisible().catch(() => false);
    if (aliceActionVisible) {
      await clickAction(pageAlice, "Retirarse");
    } else if (bobActionVisible) {
      await clickAction(pageBob, "Retirarse");
    } else {
      break;
    }
  }

  // Showdown: the winner should be visible
  await pageAlice.getByText(/Ganador|Ganadores/).first().waitFor({ state: "visible", timeout: 10_000 });
  // The "▶ Siguiente mano" button should appear
  await expect(pageAlice.getByRole("button", { name: /Siguiente/i })).toBeVisible();

  await ctxAlice.close();
  await ctxBob.close();
});
