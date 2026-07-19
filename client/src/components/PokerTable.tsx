import { PlayerSeat } from "./PlayerSeat";
import { Card } from "./Card";
import { PokerChip, ChipStack, abbreviate } from "./PokerChip";
import { PublicState, Winner } from "../types";

interface Props {
  state: PublicState;
  myId: string;
  /** Bot currently "thinking" (server is delaying before its action). */
  thinkingBot?: { id: string; name: string } | null;
}

interface SeatPos {
  top: string;
  left: string;
  /** Angle in radians (0 = right, PI/2 = bottom, PI = left, 3PI/2 = top). */
  angle: number;
  /** True for seats at the top half (content extends up from the polar point). */
  isTop: boolean;
  /** True for seats at the left/right (rendered as a horizontal strip). */
  isSide: boolean;
}

// Seat positions: arranged around the LOWER HALF of the table's ellipse
// (no seats on top). The table is a `rounded-[50%]` container with aspect
// ratio 16:10, so its visible ellipse has half-width = 50% of the
// container width and half-height = 50% of the container height.
//
// To place a point on that ellipse at polar angle θ (measured from the
// +X axis, going clockwise in screen coordinates):
//   x% = 50 + 50 * cos(θ)
//   y% = 50 + 50 * (h/w) * sin(θ)
//
// where h/w is the table's height/width ratio (10/16 = 0.625 for 16:10).
//
// We shrink the radii slightly so the polar point sits a bit inside the
// rim, leaving room for the seat content to extend inward without falling
// off the felt. The seat's outer edge is the polar point, and the content
// grows INWARD toward the center.
//
// Seats are spread across an arc centered on the bottom (θ = π/2) so the
// top half of the table is left clear for the betting tray and the
// community cards.
//
// For larger tables we narrow the arc (less horizontal spread) and pull
// side seats further inward. This keeps side seats away from the rim and
// prevents them from overlapping each other when 7+ players sit down.
// `isTop` is set when the seat polar point actually sits above the horizontal axis (sin(θ) < 0).
const TABLE_ASPECT = 10 / 16; // h/w for 16:10
const seatPositions = (n: number) => {
  if (n <= 1) {
    return [{ top: "72%", left: "50%", angle: Math.PI / 2, isTop: false, isSide: false }];
  }
  const positions: SeatPos[] = [];
  const cx = 50;
  // 180° bottom arc so players spread across the full lower rim while
  // keeping the top half clear for the board and pot.
  const seatArc = (180 * Math.PI) / 180; // full 180° bottom arc
  // Inset: keep polar point well inside the rim so the full seat content
  // (name, cards, chips, stack) fits on the felt. We shrink the ellipse
  // used for placement, then use `isSide` to shift side-seat content inward.
  // Use different radii for x and y: less vertical pull so seats on the
  // bottom arc don't clip outside the felt.
  const insetX = n <= 2 ? 0.78 : n <= 4 ? 0.74 : n <= 6 ? 0.70 : 0.66;
  const insetY = n <= 2 ? 0.70 : n <= 4 ? 0.66 : n <= 6 ? 0.62 : 0.58;
  const rx = 50 * insetX;
  const ry = 50 * TABLE_ASPECT * insetY;
  const cy = 46; // shift whole arc upward ~20px at design size
  // Side seats are those near the horizontal edges.
  const sideThreshold = Math.PI / 6; // 30° from horizontal
  const startAngle = Math.PI / 2 - seatArc / 2;
  const step = seatArc / (n - 1);
  for (let i = 0; i < n; i++) {
    const rawAngle = startAngle + i * step;
    let x = cx + rx * Math.cos(rawAngle);
    const y = cy + ry * Math.sin(rawAngle);
    // Pull the middle (bottom-center) seats horizontally closer to the center
    // so they don't sit too far apart from the pot/community cards area.
    const isBottomCenter = Math.abs(Math.cos(rawAngle)) < 0.5;
    if (isBottomCenter) {
      x = 50 + (x - 50) * 0.82; // 18% closer to the horizontal center
    }
    // Fine-tune spacing around the bottom center seats:
    // - 3rd seat (index 2): move left ~20px away from the 4th seat.
    // - 5th seat (index 4): move left ~20px closer to the 4th seat.
    if (n >= 7) {
      if (i === 2) x -= 2.0; // ~20px left at design size
      if (i === 4) x -= 2.0; // ~20px left
    }
    const angleFromHorizontal = Math.abs(Math.cos(rawAngle));
    const isSide = angleFromHorizontal > Math.cos(sideThreshold);
    const isTop = Math.sin(rawAngle) < 0;
    positions.push({
      top: `${y}%`,
      left: `${x}%`,
      angle: rawAngle,
      isTop,
      isSide,
    });
  }
  return positions;
};

export function PokerTable({ state, myId, thinkingBot = null }: Props) {
  const seats = state.players;
  const positions = seatPositions(seats.length);
  const winners = state.winners ?? [];
  const totalSeats = seats.length;

  // Central pot position: the empty area in the middle of the table where
  // every player's bet chips stack up during the hand.
  const potCenter = { top: 48, left: 50 };

  // We keep the bet chips visible on the table for the whole hand.
  // They are only cleared when a new hand starts (street goes from
  // "waiting" to "preflop"), matching the server reset of player.bet.

  const streetLabel =
    state.street === "waiting"
      ? "Esperando"
      : { preflop: "Preflop", flop: "Flop", turn: "Turn", river: "River", showdown: "Showdown" }[state.street];

  return (
    <div className="relative w-full h-full rounded-[50%] felt-pattern overflow-hidden">
      {/* Inner rim */}
      <div className="absolute inset-3 rounded-[50%] border-2 border-gold/30 pointer-events-none" />

      {/* Central pot + board area - centered higher, above players so cards are never masked */}
      <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] flex flex-col items-center">
        <div className="mb-2 px-4 py-1 rounded-full bg-black/60 border border-gold/30 backdrop-blur-sm shadow-lg">
          <span className="text-[11px] font-display text-gold-light tracking-wide">
            Bote ${abbreviate(state.pot)}
          </span>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const c = state.community[i];
            return <Card key={i} card={c} faceDown={!c} size="sm" deal dealIndex={i} />;
          })}
        </div>
      </div>

      {/* Winner chip animation — chips fly from center toward each winner seat */}
      {state.street === "showdown" && winners.length > 0 && (
        <WinnerChipFlow
          winners={winners}
          seats={seats}
          myId={myId}
          positions={positions}
        />
      )}

      {/* Players around the table - z-50 so they render above the felt rim */}
      {seats.map((p, i) => {
        const meIdx = seats.findIndex((s) => s.id === myId);
        const offset = meIdx >= 0 ? meIdx : 0;
        const posIndex = (i - offset + seats.length) % seats.length;
        const pos = positions[posIndex] ?? positions[0];
        const winner = state.street === "showdown" ? winners.find((w) => w.id === p.id) : undefined;
        return (
          <PlayerSeat
            key={p.id}
            player={p}
            isMe={p.id === myId}
            position={pos}
            isThinking={thinkingBot?.id === p.id}
            isTop={pos.isTop}
            isSide={pos.isSide}
            hideHoleCards={p.id === myId}
            compact={totalSeats >= 7}
            winnerHand={winner?.hand}
            isShowdown={state.street === "showdown"}
          />
        );
      })}

      {/* Bet chips accumulated in the center of the table, rendered at the
          table level so they never clip inside a PlayerSeat container. */}
      {seats
        .filter((p) => p.bet > 0)
        .map((p, _i, arr) => {
          const meIdx = seats.findIndex((s) => s.id === myId);
          const offset = meIdx >= 0 ? meIdx : 0;
          const posIndex =
            (seats.findIndex((s) => s.id === p.id) - offset + seats.length) % seats.length;
          const pos = positions[posIndex] ?? positions[0];
          const angle = pos.angle;
          const outwardX = Math.cos(angle);
          const outwardY = Math.sin(angle);
          const compact = totalSeats >= 7;
          // Spread chips radially around the center to avoid a single heap.
          const spread = arr.length > 1 ? 28 : 0;
          return (
            <div
              key={`bet-${p.id}`}
              className="absolute"
              style={{
                left: `${potCenter.left}%`,
                top: `${potCenter.top}%`,
                zIndex: 30,
                transform: `translate(calc(-50% + ${outwardX * spread}px), calc(-50% + ${outwardY * spread}px))`,
              }}
            >
              <div className="relative pointer-events-none">
                <ChipStack amount={p.bet} size={compact ? 18 : 22} maxChips={3} />
              </div>
            </div>
          );
        })}

      {/* Street label (bottom-right) */}
      <div
        data-testid="street-label"
        className="absolute bottom-3 right-5 text-gold/70 text-[11px] uppercase tracking-widest font-display pointer-events-none"
      >
        {streetLabel}
        {state.started && ` · Mano #${state.handNumber}`}
      </div>
    </div>
  );
}

function WinnerChipFlow({
  winners,
  seats,
  myId,
  positions,
}: {
  winners: Winner[];
  seats: PublicState["players"];
  myId: string;
  positions: SeatPos[];
}) {
  const meIdx = seats.findIndex((s) => s.id === myId);
  const offset = meIdx >= 0 ? meIdx : 0;
  return (
    <>
      {winners.map((w, i) => {
        const seatIdx = seats.findIndex((s) => s.id === w.id);
        if (seatIdx < 0) return null;
        const posIndex = (seatIdx - offset + seats.length) % seats.length;
        const pos = positions[posIndex] ?? positions[0];
        const seatLeft = parseFloat(pos.left);
        const seatTop = parseFloat(pos.top);
        const dxPct = seatLeft - 50;
        const dyPct = seatTop - 50;
        return (
          <div
            key={`win-${w.id}-${i}`}
            className="absolute z-20 pointer-events-none animate-win-to-seat"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              ["--wx" as string]: `${(dxPct * 0.5).toFixed(2)}vw`,
              ["--wy" as string]: `${(dyPct * 0.5).toFixed(2)}vh`,
              animationDelay: `${i * 0.2}s`,
            } as React.CSSProperties}
          >
            <PokerChip color="gold" size={28} value={w.amount} />
          </div>
        );
      })}
    </>
  );
}
