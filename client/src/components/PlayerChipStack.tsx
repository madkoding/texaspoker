import { PokerChip, breakIntoDenominations, abbreviate } from "./PokerChip";

interface Props {
  /** Total amount the player has. */
  amount: number;
  /** Diameter of each chip in px. */
  size?: number;
  /** Max number of chips to render per denomination tower. */
  maxPerTower?: number;
  className?: string;
  /** Whether to show the total numeric amount. Default true. */
  showTotal?: boolean;
}

/**
 * Visual representation of a player's chip stack, broken into standard
 * poker denominations. Each denomination is shown as a vertical "tower"
 * of chips (up to `maxPerTower` discs). Towers are always arranged
 * horizontally. The total amount is shown numerically by default
 * (`showTotal={false}` to hide it).
 */
export function PlayerChipStack({
  amount,
  size = 28,
  maxPerTower = 6,
  className = "",
  showTotal = true,
}: Props) {
  const denominations = breakIntoDenominations(amount);

  if (amount <= 0) {
    return (
      <div
        className={`inline-flex items-center gap-1 ${className}`}
        title="Sin fichas"
      >
        <span className="text-[10px] font-display font-bold text-pokerred drop-shadow">
          $0
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-end gap-1.5 ${className}`}
      title={`$${amount.toLocaleString()}`}
    >
      {/* Visual chip towers, one per denomination, always horizontal */}
      <div className="flex items-end gap-1">
        {denominations.map((d) => {
          const visibleCount = Math.min(maxPerTower, d.count);
          const hiddenCount = d.count - visibleCount;
          const towerHeight = size + (visibleCount - 1) * (size * 0.22);
          return (
            <div
              key={d.value}
              className="relative flex flex-col items-center justify-end"
              style={{ width: size, height: towerHeight }}
            >
              {Array.from({ length: visibleCount }).map((_, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    width: size,
                    height: size,
                    bottom: i * (size * 0.22),
                    zIndex: visibleCount - i,
                  }}
                >
                  <PokerChip
                    color={d.color}
                    size={size}
                    value={i === Math.floor(visibleCount / 2) ? d.value : undefined}
                  />
                </div>
              ))}
              {hiddenCount > 0 && (
                <div
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-display font-bold text-gold-light bg-black/80 rounded-full px-1 leading-none drop-shadow whitespace-nowrap"
                  style={{ zIndex: 50 }}
                >
                  +{hiddenCount}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Total numeric amount */}
      {showTotal && (
        <span className="text-[12px] font-display font-bold text-gold-light tabular-nums drop-shadow whitespace-nowrap ml-1 bg-black/60 rounded-full px-2 py-0.5">
          ${abbreviate(amount)}
        </span>
      )}
    </div>
  );
}
