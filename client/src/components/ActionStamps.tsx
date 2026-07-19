import { useEffect, useState } from "react";
import { ActionType, PublicState } from "../types";

const label: Record<ActionType, string> = {
  fold: "FOLD",
  check: "CHECK",
  call: "CALL",
  bet: "BET",
  raise: "RAISE",
  "all-in": "ALL-IN",
};

const colorClass: Record<ActionType, string> = {
  fold: "text-pokerred",
  check: "text-ink",
  call: "text-felt-dark",
  bet: "text-gold-dark",
  raise: "text-gold-dark",
  "all-in": "text-pokerred",
};

interface Props {
  state: PublicState;
  myId: string;
}

interface Stamp {
  id: number;
  playerName: string;
  action: ActionType;
  amount?: number;
}

/**
 * Shows a brief "stamp" animation whenever any player acts. Listens to
 * the log entries from the server and displays the most recent action
 * with a pop-in/fade-out animation.
 */
export function ActionStamps({ state, myId }: Props) {
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [seen, setSeen] = useState(0);

  // We watch the log length; whenever a new entry appears, parse it for an action.
  useEffect(() => {
    if (!state?.log) return;
    const len = state.log.length;
    if (len <= seen) {
      setSeen(len);
      return;
    }
    const newOnes = state.log.slice(seen, len);
    const newStamps: Stamp[] = [];
    for (const entry of newOnes) {
      // The server's action log uses the format "<name> <verb> ..." e.g. "Alice iguala 10"
      for (const verb of Object.keys(label) as ActionType[]) {
        const verbsEs: Record<ActionType, string[]> = {
          fold: ["se retira"],
          check: ["pasa"],
          call: ["iguala"],
          bet: ["apuesta"],
          raise: ["sube a"],
          "all-in": ["va con todo"],
        };
        const match = verbsEs[verb].find((v) => entry.message.toLowerCase().includes(v));
        if (match) {
          // Skip "se ha sentado", "se ha unido", etc. (those include "se" but not the verbs)
          if (entry.message.includes("se ha sentado") || entry.message.includes("se ha unido")) continue;
          // Extract player name (the first word)
          const playerName = entry.message.split(" ")[0];
          // Extract amount if any (trailing number)
          const amountMatch = entry.message.match(/(\d+)$/);
          const amount = amountMatch ? Number(amountMatch[1]) : undefined;
          newStamps.push({
            id: Date.now() + Math.random(),
            playerName,
            action: verb,
            amount,
          });
          break;
        }
      }
    }
    if (newStamps.length > 0) {
      setStamps((s) => [...newStamps, ...s].slice(0, 3));
      // Auto-remove after 1.2s
      setTimeout(() => {
        setStamps((s) => s.filter((st) => !newStamps.find((n) => n.id === st.id)));
      }, 1300);
    }
    setSeen(len);
  }, [state?.log?.length, seen, myId, state]);

  if (stamps.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        {stamps.map((s) => (
          <div
            key={s.id}
            className="animate-stamp font-display text-5xl md:text-6xl font-bold drop-shadow-2xl tracking-wide"
          >
            <span className={`${colorClass[s.action]}`}>{label[s.action]}</span>
            {s.amount !== undefined && (
              <div className="text-2xl text-gold-light">${s.amount}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
