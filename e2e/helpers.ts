import { Page, BrowserContext } from "@playwright/test";

/**
 * Helpers for Playwright E2E tests.
 *
 * The app stores player name and id in localStorage. We expose helpers to
 * set them directly so we can skip the NamePrompt and start from a known
 * state. The clientId is what the server uses to dedupe a player across
 * reconnects and to remember the seat.
 */
export async function setPlayerName(page: Page, name: string) {
  await page.addInitScript((n) => {
    localStorage.setItem("texaspoker.name", n as string);
  }, name);
}

export async function setClientId(page: Page, id: string) {
  await page.addInitScript((cid) => {
    localStorage.setItem("texaspoker.id", cid as string);
  }, id);
}

export async function clearStorage(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
  });
}

export async function gotoLobby(page: Page) {
  await page.goto("/");
  // Wait until the lobby title is visible
  await page.getByText("Texas").first().waitFor({ state: "visible", timeout: 10_000 });
}

export async function gotoGuide(page: Page) {
  await page.goto("/");
  await page.getByText("Texas").first().waitFor({ state: "visible", timeout: 10_000 });
  await page.getByRole("button", { name: /Ver guía de manos/i }).click();
  // The guide has a header with "Combinaciones del" in an h1
  await page.getByRole("heading", { name: /Combinaciones del/i }).waitFor({ state: "visible", timeout: 10_000 });
}

/** Wait for the WebSocket to be open. */
export async function waitForWs(page: Page) {
  await page.waitForFunction(
    () => {
      // We can't see the WS directly, but we can wait for the connection indicator
      return document.body.textContent?.includes("Conectado al servidor") ||
             document.body.textContent?.includes("Conectado");
    },
    { timeout: 10_000 }
  );
}

/** Open the in-app debug panel. */
export async function openDebugPanel(page: Page) {
  await page.getByTitle("Abrir panel de debug").click();
}

/** Read all log entries from the debug panel. */
export async function readDebugLog(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem("texaspoker.log") || "[]";
    try { return (JSON.parse(raw) as { msg: string }[]).map((e) => e.msg); }
    catch { return []; }
  });
}

/** Open the Lobby, create a new room, wait for the GameRoom to appear. */
export async function createRoom(page: Page, playerName: string) {
  await setPlayerName(page, playerName);
  await gotoLobby(page);
  await waitForWs(page);
  await page.getByRole("button", { name: /Crear sala/i }).click();
  await page.getByText(/^Sala /).waitFor({ state: "visible", timeout: 10_000 });
}

/** Open the Lobby, join a room by code. */
export async function joinRoomByCode(page: Page, code: string) {
  await page.getByRole("textbox", { name: /CÓDIGO/i }).fill(code);
  await page.getByRole("button", { name: /^Entrar$/i }).click();
  await page.getByText(new RegExp(`Sala ${code}`)).waitFor({ state: "visible", timeout: 10_000 });
}

/** Click "Jugar contra bots" in the GameRoom. */
export async function playVsBots(page: Page) {
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /Bots$/ }).first().click();
  // Wait for the hand to start. The street label uses the form "PREFLOP · MANO #1".
  await page.getByText(/PREFLOP · MANO #1/i).first().waitFor({ state: "visible", timeout: 10_000 });
}

/** Click a specific action button. */
export async function clickAction(page: Page, action: "Retirarse" | "Pasar" | "Igualar" | "All-in") {
  const btn = page.getByRole("button", { name: new RegExp(`^${action}`) });
  await btn.waitFor({ state: "visible" });
  await btn.click({ force: true });
}

/** Get the room id (5-char code) from the page header. */
export async function getRoomId(page: Page): Promise<string> {
  const text = await page.getByText(/^Sala /).first().textContent();
  const m = text?.match(/Sala\s+(\w+)/);
  if (!m) throw new Error("Could not find room id in: " + text);
  return m[1];
}
