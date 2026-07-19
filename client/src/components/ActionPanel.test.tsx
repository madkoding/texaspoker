import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActionPanel } from "./ActionPanel";
import { PublicState, PublicPlayer } from "../types";

const basePlayer: PublicPlayer = {
  id: "p1",
  name: "P1",
  chips: 1000,
  bet: 0,
  folded: false,
  allIn: false,
  isDealer: true,
  isSmallBlind: true,
  isBigBlind: false,
  isTurn: true,
  hasCards: true,
  seatIndex: 0,
  holeCards: [
    { rank: "A", suit: "♠" },
    { rank: "K", suit: "♠" },
  ],
};

function makeState(overrides: Partial<PublicState> = {}): PublicState {
  return {
    roomId: "ABCDE",
    street: "preflop",
    community: [],
    pot: 15,
    currentBet: 10,
    minRaise: 10,
    dealer: 0,
    smallBlind: 5,
    bigBlind: 10,
    players: [basePlayer, { ...basePlayer, id: "p2", name: "P2", chips: 990, isDealer: false, isSmallBlind: false, isBigBlind: true, isTurn: false, bet: 10 }],
    communityCardsRevealed: 0,
    log: [],
    started: true,
    handNumber: 1,
    ...overrides,
  };
}

describe("ActionPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows fold/check/call/all-in buttons when it's my turn", () => {
    const onAction = vi.fn();
    render(<ActionPanel state={makeState()} myId="p1" onAction={onAction} />);
    expect(screen.getByRole("button", { name: /Retirarse/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Igualar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All-in/i })).toBeInTheDocument();
  });

  it("calls onAction with fold", () => {
    const onAction = vi.fn();
    render(<ActionPanel state={makeState()} myId="p1" onAction={onAction} />);
    screen.getByText(/Retirarse/i).click();
    expect(onAction).toHaveBeenCalledWith("fold");
  });

  it("calls onAction with call and the right amount", () => {
    const onAction = vi.fn();
    render(<ActionPanel state={makeState()} myId="p1" onAction={onAction} />);
    screen.getByRole("button", { name: /Igualar \$/i }).click();
    expect(onAction).toHaveBeenCalledWith("call");
  });

  it("shows winner panel at showdown", () => {
    const state = makeState({
      street: "showdown",
      community: [
        { rank: "A", suit: "♠" },
        { rank: "K", suit: "♥" },
        { rank: "Q", suit: "♦" },
        { rank: "J", suit: "♣" },
        { rank: "10", suit: "♠" },
      ],
      winners: [{ id: "p1", name: "P1", hand: "Escalera Real", amount: 100, cards: basePlayer.holeCards! }],
    });
    render(<ActionPanel state={state} myId="p1" onAction={vi.fn()} />);
    expect(screen.getByText(/Escalera Real/i)).toBeInTheDocument();
    expect(screen.getByText(/P1/)).toBeInTheDocument();
  });

  it("shows 'waiting for next hand' when not started and < 2 players", () => {
    const state = makeState({
      started: false,
      handNumber: 1,
      players: [basePlayer],
    });
    render(<ActionPanel state={state} myId="p1" onAction={vi.fn()} />);
    expect(screen.getByText(/Esperando que se reparta la siguiente mano/i)).toBeInTheDocument();
  });

  it("disables 'not your turn' state and shows the active player", () => {
    const state = makeState({
      players: [
        { ...basePlayer, isTurn: false, isDealer: true, isSmallBlind: true },
        { ...basePlayer, id: "p2", name: "P2", isTurn: true, isDealer: false, isSmallBlind: false, isBigBlind: true, bet: 10 },
      ],
    });
    render(<ActionPanel state={state} myId="p1" onAction={vi.fn()} />);
    expect(screen.getByText(/Turno de/)).toBeInTheDocument();
    expect(screen.getByText(/P2/)).toBeInTheDocument();
  });

  it("shows all-in message when my chips are 0 and I'm not folded", () => {
    const state = makeState({
      players: [
        { ...basePlayer, chips: 0, allIn: true, isTurn: false },
        { ...basePlayer, id: "p2", chips: 990, isTurn: true, isDealer: false, isSmallBlind: false, isBigBlind: true },
      ],
    });
    render(<ActionPanel state={state} myId="p1" onAction={vi.fn()} />);
    expect(screen.getByText(/Estás all-in/i)).toBeInTheDocument();
  });

  it("shows a message if I am not in players (just sitting)", () => {
    const state = makeState({ players: [{ ...basePlayer, id: "OTHER" }] });
    render(<ActionPanel state={state} myId="p1" onAction={vi.fn()} />);
    expect(screen.getByText(/Sentado en la mesa/i)).toBeInTheDocument();
  });
});
