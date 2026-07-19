import { Card } from "./Card";
import { PlayerChipStack } from "./PlayerChipStack";
import { RoleChip } from "./RoleChip";
import { abbreviate } from "./PokerChip";
import { HandName, PublicPlayer } from "../types";

interface Props {
  player: PublicPlayer;
  isMe?: boolean;
  position: { top: string; left: string; angle: number };
  /** True when the server is delaying this bot's action. */
  isThinking?: boolean;
  /** Top vs bottom of the table; affects seat layout. */
  isTop?: boolean;
  /** Side vs top/bottom: changes seat orientation to a horizontal strip. */
  isSide?: boolean;
  /** When true, hide the hole cards (used for the human player). */
  hideHoleCards?: boolean;
  /** When true, render a more compact seat (no chip stack, smaller card). */
  compact?: boolean;
  /** If set, the seat is the showdown winner; show the hand name and reveal cards. */
  winnerHand?: HandName;
  /** If true, this seat is at showdown (shows cards of all non-folded players). */
  isShowdown?: boolean;
}

const actionLabel: Record<string, string> = {
  fold: "Se retiró",
  check: "Pasó",
  call: "Igualó",
  bet: "Apostó",
  raise: "Subió",
  "all-in": "All-in",
};

function ActionStamp({ action, amount }: { action: string; amount?: number }) {
  if (!action) return null;
  const base =
    "text-[13px] leading-none font-display font-bold drop-shadow-md whitespace-nowrap px-2 py-0.5 rounded-full border border-white/10";
  const cls =
    action === "fold"
      ? "animate-card-fold text-white bg-pokerred/90"
      : action === "check"
      ? "animate-check-tap text-felt-dark bg-felt/20"
      : action === "raise" || action === "bet"
      ? "animate-raise-bounce text-felt-dark bg-gold"
      : action === "all-in"
      ? "animate-all-in text-white bg-pokerred"
      : "animate-fade-up text-felt-dark bg-white/80";
  return (
    <div className={`${base} ${cls}`} key={action}>
      {actionLabel[action]}
      {amount !== undefined && amount > 0 && (
        <span className="ml-1 text-cream">${abbreviate(amount)}</span>
      )}
    </div>
  );
}

/**
 * Player seat "container":
 *  - The container is a vertical column with 5 rows (from outer edge inward):
 *    1. Action stamp (if any)         ← top of container
 *    2. Player name + role chips
 *    3. Hole cards
 *    4. Player's own chips (visual)
 *    5. Total numeric amount          ← bottom of container
 *  - The bet chips (current round's bet) are positioned INWARD on the
 *    felt, toward the table center.
 *  - All conditional elements are absolutely positioned to avoid
 *    layout shifts.
 */
export function PlayerSeat({
  player,
  isMe,
  position,
  isThinking,
  isTop,
  isSide,
  hideHoleCards = false,
  compact = false,
  winnerHand,
  isShowdown = false,
}: Props) {
  const hole = player.holeCards;
  const top = isTop ?? parseFloat(position.top) < 50;
  const side = isSide ?? false;
  const angle = position.angle;
  const isWinner = !!winnerHand;
  // At showdown, reveal the hole cards of all non-folded players (including
  // the human) so the winning (and losing) hands are visible on the felt.
  const showCards = isShowdown ? !player.folded : !hideHoleCards;

  // Anchor: where the polar point sits on the seat.
  //  - For top/bottom seats: anchor to the top/bottom edge of the container
  //    so the content grows INWARD toward the table center.
  //  - For side seats: anchor to the edge closest to the center (right edge
  //    for left-side seats, left edge for right-side seats) so the content
  //    grows inward along the horizontal axis.
  const seatLeft = parseFloat(position.left);
  const isLeftSide = side && seatLeft <= 50;
  const translateX = side ? (isLeftSide ? "-100%" : "0%") : "-50%";
  const translateY = side ? "-50%" : top ? "-100%" : "0%";

  // All seats use a vertical flex-col container (5 rows from outer edge
  // inward). The translate above places the polar point on the appropriate
  // edge of the container so the rows grow inward toward the center.
  const flexDirClass = top ? "flex-col-reverse" : "flex-col";

  const chipSize = compact ? 20 : 24;
  const cardSize = compact ? "sm" : "sm";

  // Horizontal component of the unit vector pointing OUTWARD from the
  // table center to the seat. Used by the thinking pill / all-in badge.
  const outwardX = Math.cos(angle);

  const isTurn = player.isTurn && !player.folded && !player.allIn;

  return (
    <div
      className={`absolute flex ${flexDirClass} items-center pointer-events-none animate-player-join ${
        isTurn ? "animate-turn-glow rounded-2xl" : ""
      } ${player.folded ? "opacity-40 grayscale" : ""}`}
      style={{
        top: position.top,
        left: position.left,
        translate: `${translateX} ${translateY}`,
        gap: "1px",
        padding: "2px",
        zIndex: 50,
      }}
    >
      {/* === PLAYER CONTAINER (5 rows, from outer edge inward) ===
          The container is a single vertical flex-col with all 5 rows.
          Conditional rows (action stamp) are always reserved so the
          container doesn't shift when they appear/disappear. */}

      {/* ROW 1: Action stamp (or winning hand name) — always reserved (min-h) */}
      <div className="min-h-[18px] flex items-center justify-center">
        {isWinner && winnerHand ? (
          <div className="text-[13px] leading-none font-display font-bold animate-fade-up text-gold-light drop-shadow-lg whitespace-nowrap px-2 py-0.5 rounded bg-gold-dark/80">
            {winnerHand}
          </div>
        ) : (
          player.lastAction && !player.folded && (
            <ActionStamp action={player.lastAction} amount={player.bet} />
          )
        )}
      </div>

      {/* ROW 2: Player name + role chips */}
      <div className="flex flex-col items-center gap-0.5 max-w-[130px]">
        <div
          className={`flex items-center justify-center gap-1 font-display text-cream text-center font-semibold leading-tight drop-shadow ${
            compact ? "text-[13px] max-w-[120px]" : "text-[15px] max-w-[150px]"
          }`}
        >
          <span className="truncate">{player.name}</span>
          {isMe && <span className="text-gold-light">(TÚ)</span>}
          {player.isDealer && <RoleChip role="D" size={chipSize - 6} />}
          {player.isSmallBlind && <RoleChip role="SB" size={chipSize - 6} />}
          {player.isBigBlind && <RoleChip role="BB" size={chipSize - 6} />}
        </div>

      </div>

      {/* ROW 3: Hole cards */}
      <div className="flex gap-0.5">
        {!showCards ? (
          <>
            <Card faceDown size={cardSize} />
            <Card faceDown size={cardSize} />
          </>
        ) : player.hasCards && hole ? (
          <>
            <Card card={hole[0]} size={cardSize} deal dealIndex={0} />
            <Card card={hole[1]} size={cardSize} deal dealIndex={1} />
          </>
        ) : player.folded ? (
          <div
            className={`${
              compact ? "w-9 h-6" : "w-10 h-7"
            } rounded-md border border-dashed border-white/30 flex items-center justify-center text-white/40 text-[8px] font-display`}
          >
            FOLD
          </div>
        ) : (
          <>
            <Card faceDown size={cardSize} deal dealIndex={0} />
            <Card faceDown size={cardSize} deal dealIndex={1} />
          </>
        )}
      </div>

      {/* ROW 4: Player's own chips (visual stack) — only the chip towers,
          no total here (total is in row 5) */}
      {player.chips > 0 && (
        <div className="mt-0.5">
          <PlayerChipStack amount={player.chips} size={chipSize} maxPerTower={2} showTotal={false} />
        </div>
      )}

      {/* ROW 5: Total numeric amount — always reserved (min-h) to avoid shifts */}
      <div className="min-h-[18px] flex items-center justify-center mt-0.5">
        <span className={`font-display font-bold text-gold-light tabular-nums drop-shadow whitespace-nowrap bg-black/60 rounded-full px-2 py-0.5 ${compact ? "text-[11px]" : "text-[13px]"}`}>
          ${abbreviate(player.chips)}
        </span>
      </div>

      {/* === ABSOLUTELY POSITIONED ELEMENTS (don't affect core layout) === */}

      {/* Turn indicator — near the cards, pointing toward the center */}
      {!side && isTurn && (
        <div
          className="absolute left-1/2 -translate-x-1/2 text-gold-light text-xl animate-bounce drop-shadow-lg z-40"
          style={
            top
              ? { bottom: 0, transform: "translate(-50%, calc(100% + 4px))" }
              : { top: 0, transform: "translate(-50%, calc(-100% - 4px))" }
          }
        >
          ▼
        </div>
      )}

      {/* Thinking pill — at the outer edge of the container (above row 1) */}
      {isThinking && (
        <div
          className="absolute z-50 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 text-[10px] text-cream font-display animate-fade-up pointer-events-none whitespace-nowrap"
          style={{
            left: "50%",
            top: 0,
            transform: `translate(calc(-50% + ${outwardX * 80}px), calc(-100% - 4px))`,
          }}
        >
          <span className="animate-bounce">🤔</span>
          <span>Pensando…</span>
        </div>
      )}



      {/* ALL-IN badge — at the outer edge */}
      {player.allIn && !player.folded && (
        <div
          className="absolute z-40 text-[8px] bg-pokerred text-white rounded-full px-1.5 py-0.5 font-display font-bold animate-pulse drop-shadow whitespace-nowrap"
          style={{
            left: "50%",
            top: 0,
            transform: `translate(calc(-50% + ${outwardX * 50}px), calc(-100% - 22px))`,
          }}
        >
          ALL-IN
        </div>
      )}
    </div>
  );
}


