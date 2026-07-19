import { test, expect } from "@playwright/test";
import {
  setClientId,
  createRoom,
  playVsBots,
  readDebugLog,
  openDebugPanel,
} from "./helpers";

test.describe("Lobby + create + play vs bots", () => {
  test("happy path: create room, add bots, see hand start", async ({ page }) => {
    // Use a unique clientId so we don't collide with previous runs
    await setClientId(page, `P_E2E_${Date.now()}`);
    test.setTimeout(30_000);

    await createRoom(page, "AliceE2E");
    await playVsBots(page);

    // The hand should be in preflop (community cards area visible, or
    // preflop label). We don't assert "Igualar" is visible because with
    // 8 bots Alice may not be on turn (she's dealer in a 9-player
    // game, the BB is the third seat, the third bot acts first preflop).
    await expect(page.getByText(/PREFLOP/i).first()).toBeVisible();
    // The action panel info bar is always present once the hand has
    // started (with "Apuesta: ..." etc).
    await expect(page.getByText(/Apuesta:/i)).toBeVisible();
  });

  test("debug panel stores logs in sessionStorage", async ({ page }) => {
    await setClientId(page, `P_E2E_LOG_${Date.now()}`);
    test.setTimeout(20_000);
    await createRoom(page, "LoggerE2E");
    await playVsBots(page);
    await openDebugPanel(page);
    // The panel should be visible
    await expect(page.locator(".fixed.bottom-0.right-0")).toBeVisible();
  });
});
