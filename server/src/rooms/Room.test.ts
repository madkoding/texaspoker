import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Room } from "./Room";

// Minimal mock socket
class MockSocket {
  sent: any[] = [];
  readyState = 1;
  send(msg: string) { this.sent.push(JSON.parse(msg)); }
  close() { this.readyState = 3; }
}

describe("Room.joinRoom", () => {
  let room: Room;
  beforeEach(() => { room = new Room("TEST1"); });
  afterEach(() => { room.broadcast(); });

  it("adds a player to the room and broadcasts state", () => {
    const s = new MockSocket() as any;
    room.joinRoom({ id: "p1", name: "P1", socket: s, roomId: "TEST1" }, "P1");
    expect(s.sent.length).toBeGreaterThan(0);
    const stateMsg = s.sent.find((m: any) => m.type === "state");
    expect(stateMsg).toBeDefined();
    expect(stateMsg.state.players.length).toBe(1);
  });

  it("dedups by id: re-join does not create a new seat", () => {
    const s1 = new MockSocket() as any;
    room.joinRoom({ id: "p1", name: "P1", socket: s1, roomId: "TEST1" }, "P1");
    s1.sent.length = 0;
    const s2 = new MockSocket() as any;
    room.joinRoom({ id: "p1", name: "P1", socket: s2, roomId: "TEST1" }, "P1");
    const stateMsg = s2.sent.find((m: any) => m.type === "state");
    expect(stateMsg.state.players.length).toBe(1);
  });
});

describe("Room.handle start", () => {
  it("requires at least 2 players", () => {
    const room = new Room("TEST2");
    const s = new MockSocket() as any;
    room.joinRoom({ id: "p1", name: "P1", socket: s, roomId: "TEST2" }, "P1");
    s.sent.length = 0;
    room.handle({ id: "p1", name: "P1", socket: s, roomId: "TEST2" }, { type: "start" });
    const err = s.sent.find((m: any) => m.type === "error");
    // Server sends a log entry, not an error. Let's check state.
    const state = s.sent.find((m: any) => m.type === "state");
    expect(state.state.started).toBe(false);
  });

  it("starts when >= 2 players", () => {
    const room = new Room("TEST3");
    const s1 = new MockSocket() as any;
    const s2 = new MockSocket() as any;
    room.joinRoom({ id: "p1", name: "P1", socket: s1, roomId: "TEST3" }, "P1");
    room.joinRoom({ id: "p2", name: "P2", socket: s2, roomId: "TEST3" }, "P2");
    s1.sent.length = 0;
    s2.sent.length = 0;
    room.handle({ id: "p1", name: "P1", socket: s1, roomId: "TEST3" }, { type: "start" });
    const state1 = s1.sent.find((m: any) => m.type === "state");
    expect(state1.state.started).toBe(true);
    expect(state1.state.street).toBe("preflop");
  });
});

describe("Room.handle action", () => {
  it("rejects action from wrong player", () => {
    const room = new Room("TEST4");
    const s1 = new MockSocket() as any;
    const s2 = new MockSocket() as any;
    room.joinRoom({ id: "p1", name: "P1", socket: s1, roomId: "TEST4" }, "P1");
    room.joinRoom({ id: "p2", name: "P2", socket: s2, roomId: "TEST4" }, "P2");
    room.handle({ id: "p1", name: "P1", socket: s1, roomId: "TEST4" }, { type: "start" });
    s1.sent.length = 0;
    s2.sent.length = 0;
    // p2 (not toAct) tries to act
    room.handle({ id: "p2", name: "P2", socket: s2, roomId: "TEST4" }, { type: "action", action: "call" });
    const err = s2.sent.find((m: any) => m.type === "error");
    expect(err).toBeDefined();
    expect(err.error).toContain("turno");
  });
});

describe("Room.handle add-bots", () => {
  it("adds bots and auto-starts hand", () => {
    const room = new Room("TEST5");
    const s = new MockSocket() as any;
    room.joinRoom({ id: "p1", name: "P1", socket: s, roomId: "TEST5" }, "P1");
    s.sent.length = 0;
    room.handle({ id: "p1", name: "P1", socket: s, roomId: "TEST5" }, { type: "add-bots", count: 3 });
    const state = s.sent.find((m: any) => m.type === "state");
    expect(state.state.players.length).toBe(3);
    expect(state.state.started).toBe(true);
    expect(state.state.players.filter((p: any) => p.isBot).length).toBe(2);
  });
});

describe("Room publicInfo", () => {
  it("reports player count", () => {
    const room = new Room("TEST6");
    const s = new MockSocket() as any;
    room.joinRoom({ id: "p1", name: "P1", socket: s, roomId: "TEST6" }, "P1");
    const info = room.publicInfo();
    expect(info.id).toBe("TEST6");
    expect(info.players).toBe(1);
    expect(info.maxPlayers).toBeGreaterThan(0);
    expect(info.started).toBe(false);
  });
});
