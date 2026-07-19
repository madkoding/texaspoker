import { Card, HandName, PublicState } from "../types";
import { RANK_VALUE } from "./deck";
import { compareHands, evaluateHand } from "./evaluator";

interface BotContext {
  me: { id: string; chips: number; bet: number; folded: boolean; allIn: boolean; holeCards: [Card, Card] };
  state: PublicState;
  // The 5 community cards we know about (state.community)
  community: Card[];
}

// Simple bot strategy:
// - preflop: call if toCall <= 10, fold if toCall > 20, otherwise check
// - postflop: rank own hand; if Pot (par o mejor) call/check; si Carta Alta, 70% check, 30% fold
// - all-in only if hand rank is Doble Par o mejor
// - bet/raise: only with Trío+ and only if no one has raised yet (limit to single raise)

export function decideBotAction(ctx: BotContext): {
  type: "fold" | "check" | "call" | "bet" | "raise" | "all-in";
  amount?: number;
} {
  const { me, state, community } = ctx;
  const toCall = Math.max(0, state.currentBet - me.bet);
  const canCheck = toCall === 0;

  // Evaluate hand if possible
  let handName: HandName = "Carta Alta";
  let handRank = 1;
  if (community.length >= 3) {
    const all7 = [...me.holeCards, ...community];
    if (all7.length === 7) {
      const ev = evaluateHand(all7);
      handName = ev.name;
      handRank = ev.rank;
    }
  }

  // All-in call: very short stack, decent hand
  if (toCall > 0 && me.chips <= state.bigBlind * 5 && me.chips >= toCall && handRank >= 2) {
    return { type: "all-in" };
  }

  // Very strong hand: raise (but only if we have plenty of chips so a
  // raise doesn't immediately commit us to all-in)
  if (handRank >= 4 && me.chips > state.bigBlind * 10) {
    if (canCheck && me.chips > 0) {
      const amt = Math.min(me.chips, Math.max(state.bigBlind * 3, state.pot / 2));
      return { type: state.currentBet === 0 ? "bet" : "raise", amount: amt };
    }
    if (toCall > 0 && me.chips > 0) {
      const amt = Math.min(me.chips, state.currentBet + Math.max(state.minRaise, state.bigBlind));
      return { type: "raise", amount: amt };
    }
  }

  // Decent hand: call
  if (handRank >= 2) {
    if (canCheck) return { type: "check" };
    if (toCall > 0 && me.chips >= toCall) return { type: "call" };
    if (toCall > 0 && me.chips < toCall) return { type: "all-in" };
  }

  // Weak hand: cheap calls, fold to big bets
  if (toCall === 0) return { type: "check" };
  if (toCall <= state.bigBlind * 2 && me.chips >= toCall) return { type: "call" };
  if (toCall <= me.chips / 10 && me.chips >= toCall) return { type: "call" };
  if (toCall > me.chips) {
    // all-in for less than call
    return { type: "all-in" };
  }
  return { type: "fold" };
}
