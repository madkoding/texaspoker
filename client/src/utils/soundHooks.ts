import { useEffect, useRef } from "react";
import { PublicState } from "../types";
import { sfx, unlockAudio } from "./sound";

/**
 * Detect the meaningful state transitions and play the appropriate
 * sound. The hook compares the current state with the previous one and
 * picks the sound based on what changed.
 *
 *   - pot increased           → chip clink (bet)
 *   - pot increased by a lot  → bet / raise sound
 *   - a player folded         → fold thud
 *   - a player checked        → check tap
 *   - a player called         → call chip
 *   - community card revealed → deal
 *   - all-in                  → all-in sound
 *   - winners changed         → win sound
 *   - street changed          → sweep (chips to pot)
 */
export function useStateSounds(state: PublicState | null) {
  const prevRef = useRef<PublicState | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    if (!state) {
      prevRef.current = null;
      return;
    }
    const prev = prevRef.current;

    // First run: don't play sounds for the initial state.
    if (firstRun.current) {
      firstRun.current = false;
      prevRef.current = state;
      return;
    }

    // No previous state to compare: skip.
    if (!prev) {
      prevRef.current = state;
      return;
    }

    // Street changed → sweep chips to pot
    if (prev.street !== state.street) {
      sfx.sweep();
    }

    // Community card count grew → deal
    if (state.community.length > prev.community.length) {
      for (let i = prev.community.length; i < state.community.length; i++) {
        // small stagger so cards "snap" in
        setTimeout(() => sfx.deal(), i * 80);
      }
    }

    // Winner announced
    if (state.street === "showdown" && state.winners && state.winners.length > 0) {
      const prevHadWinners = prev.winners && prev.winners.length > 0;
      if (!prevHadWinners) sfx.win();
    }

    // For each player, detect their action by comparing lastAction or
    // chips delta.
    for (const p of state.players) {
      const before = prev.players.find((q) => q.id === p.id);
      if (!before) continue;
      // Player folded this tick
      if (!before.folded && p.folded) {
        sfx.fold();
        continue;
      }
      // Player went all-in this tick
      if (!before.allIn && p.allIn) {
        sfx.allIn();
        continue;
      }
      // Player's bet grew (called or raised)
      if (p.bet > before.bet) {
        const delta = p.bet - before.bet;
        // If the bet > current bet of others or > previous current bet,
        // classify as a raise.
        if (delta >= (prev.currentBet || 0) * 0.5) {
          sfx.raise();
        } else {
          sfx.chip();
        }
        continue;
      }
      // Player's lastAction is "check" and we just transitioned to it
      if (before.lastAction !== "check" && p.lastAction === "check") {
        sfx.check();
        continue;
      }
    }

    prevRef.current = state;
  }, [state]);
}

/** Touch audio so the first user gesture unlocks playback. */
export function useAudioUnlock() {
  useEffect(() => {
    const handler = () => {
      unlockAudio();
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
    window.addEventListener("click", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);
}
