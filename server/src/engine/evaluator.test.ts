import { describe, it, expect } from "vitest";
import { evaluateHand, compareHands, HAND_ORDER } from "./evaluator";
import { Card } from "../types";

const c = (rank: string, suit: any): Card => ({ rank: rank as any, suit });

describe("evaluator", () => {
  describe("Escalera Real (Royal Flush)", () => {
    it("A-K-Q-J-10 same suit", () => {
      const hand = evaluateHand([
        c("A", "♠"), c("K", "♠"), c("Q", "♠"), c("J", "♠"), c("10", "♠"),
        c("2", "♣"), c("3", "♣"),
      ]);
      expect(hand.name).toBe("Escalera Real");
      expect(hand.rank).toBe(10);
    });

    it("is the highest possible hand", () => {
      const royal = evaluateHand([
        c("A", "♠"), c("K", "♠"), c("Q", "♠"), c("J", "♠"), c("10", "♠"),
        c("2", "♣"), c("3", "♣"),
      ]);
      const straightFlush = evaluateHand([
        c("9", "♠"), c("8", "♠"), c("7", "♠"), c("6", "♠"), c("5", "♠"),
        c("2", "♣"), c("3", "♣"),
      ]);
      expect(royal.rank).toBeGreaterThan(straightFlush.rank);
    });
  });

  describe("Escalera de Color (Straight Flush)", () => {
    it("5-6-7-8-9 same suit", () => {
      const hand = evaluateHand([
        c("5", "♥"), c("6", "♥"), c("7", "♥"), c("8", "♥"), c("9", "♥"),
        c("K", "♣"), c("Q", "♣"),
      ]);
      expect(hand.name).toBe("Escalera de Color");
    });

    it("higher straight flush beats lower", () => {
      const high = evaluateHand([
        c("8", "♥"), c("9", "♥"), c("10", "♥"), c("J", "♥"), c("Q", "♥"),
        c("2", "♣"), c("3", "♣"),
      ]);
      const low = evaluateHand([
        c("5", "♥"), c("6", "♥"), c("7", "♥"), c("8", "♥"), c("9", "♥"),
        c("2", "♣"), c("3", "♣"),
      ]);
      expect(compareHands(high, low)).toBeGreaterThan(0);
    });
  });

  describe("Póker (Four of a Kind)", () => {
    it("4 Kings", () => {
      const hand = evaluateHand([
        c("K", "♠"), c("K", "♥"), c("K", "♦"), c("K", "♣"),
        c("7", "♠"), c("2", "♣"), c("3", "♣"),
      ]);
      expect(hand.name).toBe("Póker");
    });

    it("higher four of a kind wins", () => {
      const aces = evaluateHand([
        c("A", "♠"), c("A", "♥"), c("A", "♦"), c("A", "♣"),
        c("2", "♠"), c("2", "♣"), c("3", "♣"),
      ]);
      const kings = evaluateHand([
        c("K", "♠"), c("K", "♥"), c("K", "♦"), c("K", "♣"),
        c("A", "♠"), c("2", "♣"), c("3", "♣"),
      ]);
      expect(compareHands(aces, kings)).toBeGreaterThan(0);
    });

    it("same four of a kind: kicker breaks tie", () => {
      const highKicker = evaluateHand([
        c("K", "♠"), c("K", "♥"), c("K", "♦"), c("K", "♣"),
        c("A", "♠"), c("2", "♣"), c("3", "♣"),
      ]);
      const lowKicker = evaluateHand([
        c("K", "♠"), c("K", "♥"), c("K", "♦"), c("K", "♣"),
        c("2", "♠"), c("2", "♣"), c("3", "♣"),
      ]);
      expect(compareHands(highKicker, lowKicker)).toBeGreaterThan(0);
    });
  });

  describe("Full House", () => {
    it("Q-Q-Q-4-4", () => {
      const hand = evaluateHand([
        c("Q", "♠"), c("Q", "♥"), c("Q", "♦"), c("4", "♣"), c("4", "♠"),
        c("2", "♣"), c("3", "♣"),
      ]);
      expect(hand.name).toBe("Full");
    });

    it("higher trip wins (same pair)", () => {
      const qq44 = evaluateHand([
        c("Q", "♠"), c("Q", "♥"), c("Q", "♦"), c("4", "♣"), c("4", "♠"),
        c("2", "♣"), c("3", "♣"),
      ]);
      const jj44 = evaluateHand([
        c("J", "♠"), c("J", "♥"), c("J", "♦"), c("4", "♣"), c("4", "♠"),
        c("2", "♣"), c("3", "♣"),
      ]);
      expect(compareHands(qq44, jj44)).toBeGreaterThan(0);
    });

    it("same trip: higher pair wins", () => {
      const qqAA = evaluateHand([
        c("Q", "♠"), c("Q", "♥"), c("Q", "♦"), c("A", "♣"), c("A", "♠"),
        c("2", "♣"), c("3", "♣"),
      ]);
      const qq44 = evaluateHand([
        c("Q", "♠"), c("Q", "♥"), c("Q", "♦"), c("4", "♣"), c("4", "♠"),
        c("2", "♣"), c("3", "♣"),
      ]);
      expect(compareHands(qqAA, qq44)).toBeGreaterThan(0);
    });
  });

  describe("Color (Flush)", () => {
    it("5 diamonds", () => {
      const hand = evaluateHand([
        c("A", "♦"), c("J", "♦"), c("8", "♦"), c("5", "♦"), c("3", "♦"),
        c("K", "♣"), c("Q", "♣"),
      ]);
      expect(hand.name).toBe("Color");
    });

    it("flush beats straight", () => {
      const flush = evaluateHand([
        c("A", "♦"), c("J", "♦"), c("8", "♦"), c("5", "♦"), c("3", "♦"),
        c("K", "♣"), c("Q", "♣"),
      ]);
      const straight = evaluateHand([
        c("10", "♠"), c("9", "♥"), c("8", "♦"), c("7", "♣"), c("6", "♠"),
        c("2", "♣"), c("3", "♣"),
      ]);
      expect(compareHands(flush, straight)).toBeGreaterThan(0);
    });

    it("higher flush wins on kicker comparison", () => {
      const high = evaluateHand([
        c("A", "♦"), c("K", "♦"), c("Q", "♦"), c("J", "♦"), c("8", "♦"),
        c("2", "♣"), c("3", "♣"),
      ]);
      const low = evaluateHand([
        c("K", "♦"), c("Q", "♦"), c("J", "♦"), c("8", "♦"), c("7", "♦"),
        c("2", "♣"), c("3", "♣"),
      ]);
      expect(high.name).toBe("Color");
      expect(low.name).toBe("Color");
      expect(compareHands(high, low)).toBeGreaterThan(0);
    });
  });

  describe("Escalera (Straight)", () => {
    it("6-7-8-9-10 mixed suits", () => {
      const hand = evaluateHand([
        c("6", "♠"), c("7", "♥"), c("8", "♦"), c("9", "♣"), c("10", "♠"),
        c("K", "♣"), c("Q", "♣"),
      ]);
      expect(hand.name).toBe("Escalera");
    });

    it("wheel A-2-3-4-5 is the lowest straight", () => {
      const hand = evaluateHand([
        c("A", "♠"), c("2", "♥"), c("3", "♦"), c("4", "♣"), c("5", "♠"),
        c("K", "♣"), c("Q", "♣"),
      ]);
      expect(hand.name).toBe("Escalera");
      expect(hand.kickers[0]).toBe(5); // 5-high
    });

    it("5-6-7-8-9 beats wheel", () => {
      const wheel = evaluateHand([
        c("A", "♠"), c("2", "♥"), c("3", "♦"), c("4", "♣"), c("5", "♠"),
        c("K", "♣"), c("Q", "♣"),
      ]);
      const higher = evaluateHand([
        c("5", "♠"), c("6", "♥"), c("7", "♦"), c("8", "♣"), c("9", "♠"),
        c("K", "♣"), c("Q", "♣"),
      ]);
      expect(compareHands(higher, wheel)).toBeGreaterThan(0);
    });

    it("straight flush beats straight", () => {
      const sf = evaluateHand([
        c("5", "♥"), c("6", "♥"), c("7", "♥"), c("8", "♥"), c("9", "♥"),
        c("K", "♣"), c("Q", "♣"),
      ]);
      const s = evaluateHand([
        c("5", "♠"), c("6", "♥"), c("7", "♦"), c("8", "♣"), c("9", "♠"),
        c("K", "♣"), c("Q", "♣"),
      ]);
      expect(compareHands(sf, s)).toBeGreaterThan(0);
    });
  });

  describe("Trío (Three of a Kind)", () => {
    it("8-8-8 + kickers", () => {
      const hand = evaluateHand([
        c("8", "♠"), c("8", "♥"), c("8", "♦"),
        c("K", "♣"), c("3", "♠"),
        c("2", "♣"), c("4", "♣"),
      ]);
      expect(hand.name).toBe("Trío");
    });

    it("higher trip wins", () => {
      const high = evaluateHand([
        c("8", "♠"), c("8", "♥"), c("8", "♦"),
        c("A", "♣"), c("K", "♠"),
        c("2", "♣"), c("3", "♣"),
      ]);
      const low = evaluateHand([
        c("7", "♠"), c("7", "♥"), c("7", "♦"),
        c("A", "♣"), c("K", "♠"),
        c("2", "♣"), c("3", "♣"),
      ]);
      expect(compareHands(high, low)).toBeGreaterThan(0);
    });
  });

  describe("Doble Par (Two Pair)", () => {
    it("10-10 + 5-5 + A kicker", () => {
      const hand = evaluateHand([
        c("10", "♠"), c("10", "♥"), c("5", "♦"), c("5", "♣"), c("A", "♠"),
        c("2", "♣"), c("3", "♣"),
      ]);
      expect(hand.name).toBe("Doble Par");
    });

    it("higher top pair wins", () => {
      const high = evaluateHand([
        c("A", "♠"), c("A", "♥"), c("5", "♦"), c("5", "♣"), c("K", "♠"),
        c("2", "♣"), c("3", "♣"),
      ]);
      const low = evaluateHand([
        c("K", "♠"), c("K", "♥"), c("Q", "♦"), c("Q", "♣"), c("A", "♠"),
        c("2", "♣"), c("3", "♣"),
      ]);
      expect(compareHands(high, low)).toBeGreaterThan(0);
    });
  });

  describe("Par (One Pair)", () => {
    it("A-A + K-8-3 kickers", () => {
      const hand = evaluateHand([
        c("A", "♠"), c("A", "♥"), c("K", "♦"), c("8", "♣"), c("3", "♠"),
        c("2", "♣"), c("4", "♣"),
      ]);
      expect(hand.name).toBe("Par");
    });

    it("higher pair wins", () => {
      const high = evaluateHand([
        c("A", "♠"), c("A", "♥"), c("K", "♦"), c("8", "♣"), c("3", "♠"),
        c("2", "♣"), c("4", "♣"),
      ]);
      const low = evaluateHand([
        c("K", "♠"), c("K", "♥"), c("A", "♦"), c("8", "♣"), c("3", "♠"),
        c("2", "♣"), c("4", "♣"),
      ]);
      expect(compareHands(high, low)).toBeGreaterThan(0);
    });
  });

  describe("Carta Alta (High Card)", () => {
    it("A-J-9-6-3", () => {
      const hand = evaluateHand([
        c("A", "♠"), c("J", "♥"), c("9", "♦"), c("6", "♣"), c("3", "♠"),
        c("2", "♣"), c("4", "♣"),
      ]);
      expect(hand.name).toBe("Carta Alta");
    });

    it("high card wins", () => {
      const a = evaluateHand([
        c("A", "♠"), c("J", "♥"), c("9", "♦"), c("6", "♣"), c("3", "♠"),
        c("2", "♣"), c("4", "♣"),
      ]);
      const k = evaluateHand([
        c("K", "♠"), c("J", "♥"), c("9", "♦"), c("6", "♣"), c("3", "♠"),
        c("2", "♣"), c("4", "♣"),
      ]);
      expect(compareHands(a, k)).toBeGreaterThan(0);
    });
  });

  describe("HAND_ORDER is correct", () => {
    it("orders from lowest to highest", () => {
      expect(HAND_ORDER).toEqual([
        "Carta Alta",
        "Par",
        "Doble Par",
        "Trío",
        "Escalera",
        "Color",
        "Full",
        "Póker",
        "Escalera de Color",
        "Escalera Real",
      ]);
    });
  });

  describe("errors", () => {
    it("throws on wrong number of cards", () => {
      expect(() => evaluateHand([c("A", "♠")])).toThrow();
    });
  });
});
