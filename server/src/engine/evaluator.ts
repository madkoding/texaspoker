import { Card, HandName, Rank, Suit } from "../types/index.js";
import { RANK_VALUE } from "./deck.js";

const HAND_RANK: Record<HandName, number> = {
  "Escalera Real": 10,
  "Escalera de Color": 9,
  "Póker": 8,
  "Full": 7,
  "Color": 6,
  "Escalera": 5,
  "Trío": 4,
  "Doble Par": 3,
  "Par": 2,
  "Carta Alta": 1,
};

export interface EvaluatedHand {
  name: HandName;
  rank: number;
  kickers: number[];
  cards: Card[];
}

export const HAND_ORDER: HandName[] = [
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
];

function bestStraight(ranks: number[]): number | null {
  const unique = Array.from(new Set(ranks)).sort((a, b) => b - a);
  // wheel: A-2-3-4-5 => treat as 5-high straight
  if (
    unique.includes(14) &&
    unique.includes(2) &&
    unique.includes(3) &&
    unique.includes(4) &&
    unique.includes(5)
  ) {
    return 5;
  }
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i] - unique[i + 4] === 4) return unique[i];
  }
  return null;
}

export function evaluateHand(seven: Card[]): EvaluatedHand {
  if (seven.length !== 7) throw new Error("Need 7 cards");

  const rankCounts = new Map<number, Card[]>();
  const suitMap = new Map<Suit, Card[]>();
  const allRanks: number[] = [];

  for (const c of seven) {
    const v = RANK_VALUE[c.rank];
    allRanks.push(v);
    const list = rankCounts.get(v) ?? [];
    list.push(c);
    rankCounts.set(v, list);
    const sl = suitMap.get(c.suit) ?? [];
    sl.push(c);
    suitMap.set(c.suit, sl);
  }

  // counts per rank
  const counts: { value: number; cards: Card[] }[] = [];
  for (const [v, cards] of rankCounts) {
    counts.push({ value: v, cards });
  }
  counts.sort((a, b) => {
    if (b.cards.length !== a.cards.length) return b.cards.length - a.cards.length;
    return b.value - a.value;
  });

  // 1) Flush (5 same suit)?
  let flushSuit: Suit | null = null;
  for (const [s, list] of suitMap) if (list.length >= 5) flushSuit = s;

  // 2) Straight / Straight flush
  const straightHigh = bestStraight(allRanks);
  let straightFlushHigh: number | null = null;
  if (flushSuit) {
    const fsRanks = suitMap.get(flushSuit)!.map((c) => RANK_VALUE[c.rank]);
    straightFlushHigh = bestStraight(fsRanks);
  }

  if (straightFlushHigh === 14) {
    return {
      name: "Escalera Real",
      rank: HAND_RANK["Escalera Real"],
      kickers: [14],
      cards: suitMap.get(flushSuit!)!.slice(0, 5),
    };
  }
  if (straightFlushHigh !== null) {
    return {
      name: "Escalera de Color",
      rank: HAND_RANK["Escalera de Color"],
      kickers: [straightFlushHigh],
      cards: suitMap.get(flushSuit!)!.slice(0, 5),
    };
  }

  // 4 of a kind
  if (counts[0] && counts[0].cards.length === 4) {
    const four = counts[0];
    const kicker = counts.find((c) => c.cards.length === 1)!;
    return {
      name: "Póker",
      rank: HAND_RANK["Póker"],
      kickers: [four.value, kicker.value],
      cards: [...four.cards, kicker.cards[0]],
    };
  }

  // Full house
  if (counts[0]?.cards.length === 3 && counts[1]?.cards.length >= 2) {
    const trip = counts[0];
    const pair = counts[1];
    return {
      name: "Full",
      rank: HAND_RANK["Full"],
      kickers: [trip.value, pair.value],
      cards: [...trip.cards.slice(0, 3), ...pair.cards.slice(0, 2)],
    };
  }

  // Flush
  if (flushSuit) {
    const flushCards = suitMap.get(flushSuit)!.slice().sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank]);
    const top5 = flushCards.slice(0, 5);
    return {
      name: "Color",
      rank: HAND_RANK["Color"],
      kickers: top5.map((c) => RANK_VALUE[c.rank]),
      cards: top5,
    };
  }

  // Straight
  if (straightHigh !== null) {
    return {
      name: "Escalera",
      rank: HAND_RANK["Escalera"],
      kickers: [straightHigh],
      cards: seven.slice(0, 5),
    };
  }

  // Three of a kind
  if (counts[0]?.cards.length === 3) {
    const trip = counts[0];
    const kickers = counts
      .filter((c) => c.cards.length === 1)
      .slice(0, 2)
      .map((c) => c.value);
    return {
      name: "Trío",
      rank: HAND_RANK["Trío"],
      kickers: [trip.value, ...kickers],
      cards: [...trip.cards, ...counts.filter((c) => c.cards.length === 1).slice(0, 2).map((c) => c.cards[0])],
    };
  }

  // Two pair
  if (counts[0]?.cards.length === 2 && counts[1]?.cards.length === 2) {
    const high = counts[0].value > counts[1].value ? counts[0] : counts[1];
    const low = high === counts[0] ? counts[1] : counts[0];
    const kicker = counts.find((c) => c.cards.length === 1)!;
    return {
      name: "Doble Par",
      rank: HAND_RANK["Doble Par"],
      kickers: [high.value, low.value, kicker.value],
      cards: [
        ...high.cards.slice(0, 2),
        ...low.cards.slice(0, 2),
        kicker.cards[0],
      ],
    };
  }

  // One pair
  if (counts[0]?.cards.length === 2) {
    const pair = counts[0];
    const kickers = counts
      .filter((c) => c.cards.length === 1)
      .slice(0, 3)
      .map((c) => c.value);
    return {
      name: "Par",
      rank: HAND_RANK["Par"],
      kickers: [pair.value, ...kickers],
      cards: [
        ...pair.cards,
        ...counts.filter((c) => c.cards.length === 1).slice(0, 3).map((c) => c.cards[0]),
      ],
    };
  }

  // High card
  const sorted = seven.slice().sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank]);
  return {
    name: "Carta Alta",
    rank: HAND_RANK["Carta Alta"],
    kickers: sorted.slice(0, 5).map((c) => RANK_VALUE[c.rank]),
    cards: sorted.slice(0, 5),
  };
}

export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const av = a.kickers[i] ?? 0;
    const bv = b.kickers[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

export function rankHand(seven: Card[]): number {
  return evaluateHand(seven).rank;
}

export function handName(seven: Card[]): HandName {
  return evaluateHand(seven).name;
}
