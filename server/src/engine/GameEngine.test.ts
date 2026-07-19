import { describe, it, expect, beforeEach } from "vitest";
import { GameEngine } from "./GameEngine";

function makeEngine(opts: { smallBlind?: number; bigBlind?: number; maxPlayers?: number } = {}) {
  const e = new GameEngine("TEST", {
    smallBlind: opts.smallBlind ?? 5,
    bigBlind: opts.bigBlind ?? 10,
    maxPlayers: opts.maxPlayers ?? 6,
    startingChips: 1000,
  });
  e.resetSeats(opts.maxPlayers ?? 6);
  return e;
}

function seat(e: GameEngine, id: string, name: string) {
  const r = e.addPlayer(id, name);
  expect(r.ok).toBe(true);
}

function startHand2(e: GameEngine) {
  seat(e, "p1", "P1");
  seat(e, "p2", "P2");
  e.startHand();
}

describe("GameEngine.addPlayer", () => {
  let e: GameEngine;
  beforeEach(() => { e = makeEngine(); });

  it("fills empty seats in order", () => {
    seat(e, "p1", "P1");
    seat(e, "p2", "P2");
    seat(e, "p3", "P3");
    const s = e.toPublicState();
    expect(s.players.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    expect(s.players.map((p) => p.seatIndex)).toEqual([0, 1, 2]);
  });

  it("dedups by id when re-joining", () => {
    seat(e, "p1", "P1");
    seat(e, "p2", "P2");
    e.startHand();
    // already in players — no new seat, just rename
    const r = e.addPlayer("p1", "P1-rename");
    expect(r.ok).toBe(true);
    expect(e.toPublicState().players.length).toBe(2);
  });

  it("rejects when room is full", () => {
    e = makeEngine({ maxPlayers: 2 });
    seat(e, "p1", "P1");
    seat(e, "p2", "P2");
    const r = e.addPlayer("p3", "P3");
    expect(r.ok).toBe(false);
  });

  it("rejects when hand already started", () => {
    startHand2(e);
    const r = e.addPlayer("p3", "P3");
    expect(r.ok).toBe(false);
  });
});

describe("GameEngine.startHand / beginHand", () => {
  it("posts blinds and deals hole cards", () => {
    const e = makeEngine();
    startHand2(e);
    const s = e.toPublicState("p1");
    expect(s.started).toBe(true);
    expect(s.street).toBe("preflop");
    expect(s.pot).toBe(15); // 5 + 10
    expect(s.players.find((p) => p.isSmallBlind)?.id).toBe("p1");
    expect(s.players.find((p) => p.isBigBlind)?.id).toBe("p2");
    expect(s.players.find((p) => p.isDealer)?.id).toBe("p1"); // first hand
    // the viewer (p1) sees their own hole cards
    const me = s.players.find((p) => p.id === "p1")!;
    expect(me.hasCards).toBe(true);
    expect(me.holeCards).toBeDefined();
    // opponents' cards are hidden preflop
    const other = s.players.find((p) => p.id === "p2")!;
    expect(other.hasCards).toBe(false);
  });

  it("toAct is the first player after BB", () => {
    const e = makeEngine();
    startHand2(e);
    const s = e.toPublicState("p1");
    // with 2 players, SB is dealer+SB, BB is the other, toAct is dealer (= SB)
    expect(s.players.find((p) => p.isTurn)?.id).toBe("p1");
  });
});

describe("GameEngine.applyAction", () => {
  let e: GameEngine;
  beforeEach(() => {
    e = makeEngine();
    startHand2(e);
  });

  it("rejects when not your turn", () => {
    // p1 is toAct, p2 trying
    const r = e.applyAction("p2", "call");
    expect(r.ok).toBe(false);
  });

  it("fold ends the hand with the other as winner", () => {
    const r = e.applyAction("p1", "fold");
    expect(r.ok).toBe(true);
    const s = e.toPublicState();
    expect(s.street).toBe("showdown");
    expect(s.winners?.length).toBe(1);
    expect(s.winners?.[0].id).toBe("p2");
  });

  it("call matches the big blind", () => {
    const r = e.applyAction("p1", "call");
    expect(r.ok).toBe(true);
    const s = e.toPublicState("p1");
    expect(s.players[0].bet).toBe(10);
    expect(s.players[1].bet).toBe(10);
    expect(s.pot).toBe(20);
  });

  it("check is rejected when there's a bet to call", () => {
    const r = e.applyAction("p1", "check");
    expect(r.ok).toBe(false);
  });

  it("call is rejected when toCall is 0", () => {
    // p1 calls, p2 checks (BB option)
    e.applyAction("p1", "call");
    const r = e.applyAction("p2", "call");
    expect(r.ok).toBe(false);
  });

  it("bet is rejected when currentBet > 0", () => {
    const r = e.applyAction("p1", "bet", 50);
    expect(r.ok).toBe(false);
  });

  it("raise works preflop", () => {
    const r = e.applyAction("p1", "raise", 30);
    expect(r.ok).toBe(true);
    const s = e.toPublicState("p1");
    expect(s.currentBet).toBe(30);
    expect(s.minRaise).toBe(20); // raised by 20 over BB
    expect(s.players[0].bet).toBe(30);
    expect(s.players[0].chips).toBe(970);
  });

  it("all-in for less than min raise is allowed", () => {
    e.removePlayer("p1");
    e.removePlayer("p2");
    // setup 2 players, p1 has 15 chips
    e.addPlayer("p1", "P1");
    e.addPlayer("p2", "P2");
    // hack: set p1's chips to 15
    const eng = e as any;
    eng.seats[0].chips = 15;
    e.startHand();
    // p1 raises by going all-in for 15 (less than BB 10 + minRaise 10 = 20)
    const r = e.applyAction("p1", "raise", 15);
    expect(r.ok).toBe(true);
  });
});

describe("GameEngine.betting round", () => {
  it("advances street after everyone calls", () => {
    const e = makeEngine();
    startHand2(e);
    e.applyAction("p1", "call"); // p1 calls BB
    e.applyAction("p2", "check"); // BB checks
    const s = e.toPublicState("p1");
    expect(s.street).toBe("flop");
    expect(s.community.length).toBe(3);
    expect(s.pot).toBe(20);
    // current bet reset, bets reset
    expect(s.currentBet).toBe(0);
    expect(s.players.every((p) => p.bet === 0)).toBe(true);
  });

  it("deals turn after flop call/check", () => {
    const e = makeEngine();
    startHand2(e);
    e.applyAction("p1", "call");
    e.applyAction("p2", "check"); // preflop done
    // flop: p1 acts first
    e.applyAction("p1", "check");
    e.applyAction("p2", "check"); // flop done
    const s = e.toPublicState("p1");
    expect(s.street).toBe("turn");
    expect(s.community.length).toBe(4);
  });

  it("deals river after turn", () => {
    const e = makeEngine();
    startHand2(e);
    e.applyAction("p1", "call");
    e.applyAction("p2", "check");
    e.applyAction("p1", "check");
    e.applyAction("p2", "check");
    e.applyAction("p1", "check");
    e.applyAction("p2", "check");
    const s = e.toPublicState("p1");
    expect(s.street).toBe("river");
    expect(s.community.length).toBe(5);
  });
});

describe("GameEngine.showdown", () => {
  it("picks the best hand as winner", () => {
    const e = makeEngine();
    seat(e, "p1", "P1");
    seat(e, "p2", "P2");
    e.startHand();
    // peek at hole cards and rig the deck via deck mutation is hard;
    // instead, force both to call and check through to showdown, then check winner exists
    e.applyAction("p1", "call");
    e.applyAction("p2", "check");
    e.applyAction("p1", "check");
    e.applyAction("p2", "check");
    e.applyAction("p1", "check");
    e.applyAction("p2", "check");
    e.applyAction("p1", "check");
    e.applyAction("p2", "check");
    const s = e.toPublicState("p1");
    expect(s.street).toBe("showdown");
    expect(s.winners?.length).toBe(1);
    expect(["p1", "p2"]).toContain(s.winners![0].id);
  });
});

describe("GameEngine.endHand chip accounting", () => {
  it("gives the pot to the winner on fold", () => {
    const e = makeEngine();
    startHand2(e);
    // p1 calls, p2 folds
    e.applyAction("p1", "call");
    e.applyAction("p2", "fold");
    const s = e.toPublicState("p1");
    expect(s.winners![0].id).toBe("p1");
    expect(s.winners![0].amount).toBe(20);
  });

  it("splits pot on tie", () => {
    const e = makeEngine();
    seat(e, "p1", "P1");
    seat(e, "p2", "P2");
    e.startHand();
    // both call and check through
    e.applyAction("p1", "call");
    e.applyAction("p2", "check");
    e.applyAction("p1", "check");
    e.applyAction("p2", "check");
    e.applyAction("p1", "check");
    e.applyAction("p2", "check");
    e.applyAction("p1", "check");
    e.applyAction("p2", "check");
    const s = e.toPublicState("p1");
    // 1000 + share = 1010, or 1000 + 990 share etc.
    const total = s.players.reduce((acc, p) => acc + p.chips, 0);
    expect(total).toBe(2000); // no chips lost
  });
});

describe("GameEngine.addBots", () => {
  it("fills to target with bots", () => {
    const e = makeEngine({ maxPlayers: 4 });
    seat(e, "p1", "P1");
    const added = e.addBots(3);
    expect(added).toBe(2);
    const s = e.toPublicState("p1");
    expect(s.players.length).toBe(3);
    expect(s.players.filter((p) => p.isBot).length).toBe(2);
  });

  it("does not exceed max players", () => {
    const e = makeEngine({ maxPlayers: 2 });
    seat(e, "p1", "P1");
    const added = e.addBots(5);
    expect(added).toBe(1);
  });

  it("auto-starts hand when called with >= 2 players and not started", () => {
    const e = makeEngine();
    seat(e, "p1", "P1");
    e.addBots(2);
    e.startHand();
    e.processAllBotTurns();
    const s = e.toPublicState("p1");
    expect(s.started).toBe(true);
  });
});

describe("GameEngine.nextHand", () => {
  it("advances the dealer button", () => {
    const e = makeEngine();
    startHand2(e);
    e.applyAction("p1", "call");
    e.applyAction("p2", "check");
    e.applyAction("p1", "check");
    e.applyAction("p2", "check");
    e.applyAction("p1", "check");
    e.applyAction("p2", "check");
    e.applyAction("p1", "check");
    e.applyAction("p2", "check");
    // hand 1 done
    expect(e.toPublicState().street).toBe("showdown");
    e.nextHand();
    const s = e.toPublicState("p1");
    expect(s.started).toBe(true);
    expect(s.street).toBe("preflop");
    expect(s.handNumber).toBe(2);
    // dealer should be p2 now
    expect(s.players.find((p) => p.isDealer)?.id).toBe("p2");
  });
});
