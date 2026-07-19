import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, ChildProcess } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { WebSocket } from "ws";

let server: ChildProcess;
let port = 0;

function pickPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    import("node:net").then(({ createServer }) => {
      const s = createServer();
      s.listen(0, () => {
        const p = (s.address() as any).port;
        s.close(() => resolve(p));
      });
      s.on("error", reject);
    });
  });
}

async function waitForServer(url: string, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`Server not ready at ${url}`);
}

beforeAll(async () => {
  port = await pickPort();
  server = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: __dirname + "/../..",
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForServer(`http://localhost:${port}/health`);
}, 15000);

afterAll(async () => {
  if (server) {
    server.kill("SIGTERM");
    await sleep(200);
    if (!server.killed) server.kill("SIGKILL");
  }
});

function open(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

function nextState(ws: WebSocket): Promise<any> {
  return new Promise((resolve) => {
    const handler = (raw: any) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "state") {
        ws.off("message", handler);
        resolve(msg.state);
      }
    };
    ws.on("message", handler);
  });
}

describe("WS server E2E", () => {
  it("rejects create with no clientId and rejoins cleanly", async () => {
    const ws = await open();
    const stateP = nextState(ws);
    ws.send(JSON.stringify({ type: "create", name: "Alice" }));
    const s = await stateP;
    expect(s.players.length).toBe(1);
    ws.close();
  });

  it("two clients can join and play a hand", async () => {
    const ws1 = await open();
    const ws2 = await open();

    // ws1 creates
    const s1P = nextState(ws1);
    ws1.send(JSON.stringify({ type: "create", name: "Alice", clientId: "P_AAA" }));
    const s1 = await s1P;
    const roomId = s1.roomId;
    expect(s1.players.length).toBe(1);

    // ws2 joins
    const s2P = nextState(ws2);
    ws2.send(JSON.stringify({ type: "join", roomId, name: "Bob", clientId: "P_BBB" }));
    const s2 = await s2P;
    expect(s2.players.length).toBe(2);

    // ws1 starts the hand
    const afterStartP = nextState(ws1);
    ws1.send(JSON.stringify({ type: "start", clientId: "P_AAA" }));
    const sStarted = await afterStartP;
    expect(sStarted.started).toBe(true);
    expect(sStarted.street).toBe("preflop");

    ws1.close();
    ws2.close();
  });

  it("add-bots auto-starts the hand", async () => {
    const ws = await open();
    const sCreate = nextState(ws);
    ws.send(JSON.stringify({ type: "create", name: "Alice", clientId: "P_AAA" }));
    const s1 = await sCreate;

    const sBots = nextState(ws);
    ws.send(JSON.stringify({ type: "add-bots", count: 3, clientId: "P_AAA" }));
    const s2 = await sBots;
    expect(s2.players.length).toBe(3);
    expect(s2.started).toBe(true);
    expect(s2.players.filter((p: any) => p.isBot).length).toBe(2);

    ws.close();
  });

  it("rejects action with reason", async () => {
    const ws1 = await open();
    const ws2 = await open();
    const s1P = nextState(ws1);
    ws1.send(JSON.stringify({ type: "create", name: "Alice", clientId: "P_AAA" }));
    const s1 = await s1P;
    const s2P = nextState(ws2);
    ws2.send(JSON.stringify({ type: "join", roomId: s1.roomId, name: "Bob", clientId: "P_BBB" }));
    await s2P;
    const afterStartP = nextState(ws1);
    ws1.send(JSON.stringify({ type: "start", clientId: "P_AAA" }));
    await afterStartP;

    // Bob tries to act out of turn
    const errP = new Promise<any>((resolve) => {
      const handler = (raw: any) => {
        const m = JSON.parse(raw.toString());
        if (m.type === "error") { ws2.off("message", handler); resolve(m); }
      };
      ws2.on("message", handler);
    });
    ws2.send(JSON.stringify({ type: "action", action: "call", clientId: "P_BBB" }));
    const err = await errP;
    expect(err.error).toBeDefined();

    ws1.close();
    ws2.close();
  });
});
