import { CSSProperties } from "react";

export type ChipColor = "red" | "blue" | "green" | "yellow" | "purple" | "black" | "gold";

/** Standard poker chip denominations with their assigned colors. */
export const DENOMINATIONS: { value: number; color: ChipColor; label: string }[] = [
  { value: 10000, color: "gold", label: "10K" },
  { value: 5000, color: "purple", label: "5K" },
  { value: 1000, color: "black", label: "1K" },
  { value: 500, color: "yellow", label: "500" },
  { value: 100, color: "green", label: "100" },
  { value: 50, color: "blue", label: "50" },
  { value: 20, color: "red", label: "20" },
  { value: 10, color: "red", label: "10" },
  { value: 5, color: "red", label: "5" },
];

/** Abbreviate a large number for display on chip faces. */
export function abbreviate(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + "M";
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + "K";
  }
  return String(value);
}

/** Break a chip amount into standard denominations (largest first). */
export function breakIntoDenominations(amount: number): { value: number; color: ChipColor; count: number }[] {
  if (amount <= 0) return [];
  const result: { value: number; color: ChipColor; count: number }[] = [];
  let remaining = amount;
  for (const d of DENOMINATIONS) {
    const count = Math.floor(remaining / d.value);
    if (count > 0) {
      result.push({ value: d.value, color: d.color, count });
      remaining -= count * d.value;
    }
  }
  return result;
}

interface PokerChipProps {
  color?: ChipColor;
  size?: number; // diameter in px
  /** Value text shown in the center (e.g. "5", "100", "1K", "10K"). */
  value?: string | number;
  className?: string;
  style?: CSSProperties;
}

const PALETTE: Record<ChipColor, { face: string; edge: string; rim: string; text: string }> = {
  red:    { face: "#c0392b", edge: "#7a1f17", rim: "#f5e7c8", text: "#fff8e7" },
  blue:   { face: "#2c3e50", edge: "#16202b", rim: "#f5e7c8", text: "#fff8e7" },
  green:  { face: "#16a085", edge: "#0e6b59", rim: "#f5e7c8", text: "#fff8e7" },
  yellow: { face: "#d4af37", edge: "#8a731f", rim: "#f5e7c8", text: "#3b2a08" },
  purple: { face: "#8e44ad", edge: "#5a2c6e", rim: "#f5e7c8", text: "#fff8e7" },
  black:  { face: "#1a1a1a", edge: "#0a0a0a", rim: "#f5e7c8", text: "#fff8e7" },
  gold:   { face: "#e8c252", edge: "#8a6a18", rim: "#fff8e7", text: "#3b2a08" },
};

const DASH_PATTERN = `repeating-conic-gradient(from 0deg, #f5e7c8 0deg 4deg, transparent 4deg 12deg)`;

/**
 * A single realistic-looking poker chip: outer cream rim with dashed edge,
 * colored body, and a value label.
 */
export function PokerChip({
  color = "red",
  size = 28,
  value,
  className = "",
  style,
}: PokerChipProps) {
  const p = PALETTE[color];
  const chipStyle: CSSProperties = {
    width: size,
    height: size,
    background: `radial-gradient(circle at 35% 30%, ${p.face}, ${p.edge})`,
    boxShadow: `inset 0 0 0 3px ${p.rim}, inset 0 0 0 4px ${p.edge}, 0 2px 4px rgba(0,0,0,0.45)`,
    ...style,
  };
  return (
    <div
      className={`relative inline-block rounded-full ${className}`}
      style={chipStyle}
    >
      {/* dashed edge ring */}
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: size * 0.16,
          background: DASH_PATTERN,
          mask: "radial-gradient(circle, transparent 0 calc(50% - 1px), #000 calc(50% - 1px) 50%, transparent 50%)",
          WebkitMask:
            "radial-gradient(circle, transparent 0 calc(50% - 1px), #000 calc(50% - 1px) 50%, transparent 50%)",
          opacity: 0.8,
        }}
      />
      {/* center label */}
      {value !== undefined && value !== "" && (
        <div
          className="absolute inset-0 flex items-center justify-center font-display font-bold"
          style={{
            color: p.text,
            fontSize: Math.max(7, Math.floor(size * 0.34)),
            lineHeight: 1,
            textShadow: "0 1px 0 rgba(0,0,0,0.4)",
          }}
        >
          {typeof value === "number" ? abbreviate(value) : value}
        </div>
      )}
    </div>
  );
}

interface ChipStackProps {
  /** Total amount to represent. */
  amount: number;
  /** Max number of chip discs to render. */
  maxChips?: number;
  /** Diameter of each chip in px. */
  size?: number;
  /** Visual spacing between chips (overlap). */
  className?: string;
  style?: CSSProperties;
}

const CHIP_COLOR_CYCLE: ChipColor[] = ["red", "blue", "green", "yellow", "purple", "black"];

/**
 * Stack of chips proportional to a value. The "thickness" of the stack
 * (number of discs) is capped so we always look like a tidy stack.
 */
export function ChipStack({ amount, maxChips = 5, size = 24, className = "", style }: ChipStackProps) {
  if (amount <= 0) return null;
  const denoms = breakIntoDenominations(amount);
  // Determine how many discs to render: one per meaningful chunk, capped.
  let count = 0;
  for (const d of denoms) {
    count += Math.min(d.count, maxChips <= denoms.length ? 1 : 2);
  }
  count = Math.min(maxChips, Math.max(1, count));

  const chips = Array.from({ length: count }).map((_, i) => {
    const color = CHIP_COLOR_CYCLE[i % CHIP_COLOR_CYCLE.length];
    const isCenter = i === Math.floor(count / 2);
    return (
      <div
        key={i}
        className="relative"
        style={{
          width: size,
          height: size,
          marginTop: i === 0 ? 0 : -size * 0.72,
          zIndex: count - i,
        }}
      >
        <PokerChip color={color} size={size} value={isCenter ? amount : undefined} />
      </div>
    );
  });
  return (
    <div
      className={`flex flex-col items-center ${className}`}
      style={{
        height: size + (count - 1) * size * 0.28,
        ...style,
      }}
    >
      {chips}
    </div>
  );
}

interface BetChipStackProps {
  amount: number;
  size?: number;
  className?: string;
  /** When provided, the chip animates in from the seat. */
  animateFrom?: { x: number; y: number };
}

/** A short stack (1-2 chips) for in-flight bets on the felt. */
export function BetChipStack({ amount, size = 20, className = "", animateFrom }: BetChipStackProps) {
  if (amount <= 0) return null;
  const count = Math.min(2, Math.max(1, Math.ceil(amount / 200)));
  const color = amount >= 200 ? "purple" : amount >= 50 ? "green" : "red";
  return (
    <div className={`flex flex-col items-center ${className}`} style={{ height: size + (count - 1) * size * 0.4 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`relative ${animateFrom ? "animate-bet-from-seat" : ""}`}
          style={{
            width: size,
            height: size,
            marginTop: i === 0 ? 0 : -size * 0.6,
            zIndex: count - i,
            transform: animateFrom ? `translate(${animateFrom.x}px, ${animateFrom.y}px)` : undefined,
            animationDelay: animateFrom ? `${i * 80}ms` : undefined,
          }}
        >
          <PokerChip color={color} size={size} value={i === 0 ? amount : undefined} />
        </div>
      ))}
    </div>
  );
}
