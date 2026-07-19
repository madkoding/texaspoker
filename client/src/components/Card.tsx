import { Card as CardType } from "../types";

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  highlight?: boolean;
  /** Animate on mount (slide in from above). Useful for community cards. */
  deal?: boolean;
  /** Small index used to stagger deal animation. */
  dealIndex?: number;
}

const sizeMap = {
  xs: { box: "w-9 h-12", rank: "text-[10px]", center: "text-xl" },
  sm: { box: "w-14 h-[84px]", rank: "text-xs", center: "text-3xl" },
  md: { box: "w-[72px] h-[102px]", rank: "text-sm", center: "text-4xl" },
  lg: { box: "w-[96px] h-[136px]", rank: "text-base", center: "text-5xl" },
};

export function Card({ card, faceDown, size = "md", highlight, deal, dealIndex = 0 }: CardProps) {
  const sz = sizeMap[size];
  const dealStyle = deal
    ? { animationDelay: `${dealIndex * 120}ms` }
    : undefined;
  const dealClass = deal ? "animate-card-in" : "";

  if (faceDown || !card) {
    return (
      <div
        className={`${sz.box} ${dealClass} relative rounded-xl border-2 border-felt-dark bg-gradient-to-br from-felt-dark to-felt-light shadow-card flex items-center justify-center overflow-hidden`}
        style={dealStyle}
      >
        <div className="absolute inset-1 rounded-lg border border-gold/50 flex items-center justify-center bg-[radial-gradient(circle_at_35%_30%,_rgba(255,255,255,0.08),_transparent_60%)]">
          <div className="w-[70%] h-[70%] rounded-md border border-gold/25 flex items-center justify-center bg-felt-dark/40">
            <span className="text-gold/80 text-2xl font-display drop-shadow">♠</span>
          </div>
        </div>
      </div>
    );
  }
  const isRed = card.suit === "♥" || card.suit === "♦";
  const color = isRed ? "suit-red" : "suit-black";
  return (
    <div
      className={`${sz.box} ${dealClass} relative rounded-xl bg-gradient-to-br from-white to-cream border border-black/20 shadow-card font-display font-bold ${
        highlight ? "ring-2 ring-gold -translate-y-1.5" : ""
      } transition-transform hover:-translate-y-0.5`}
      style={dealStyle}
    >
      <div className={`absolute top-1.5 left-1.5 flex flex-col items-center leading-none ${color} ${sz.rank}`}>
        <span>{card.rank}</span>
        <span className="text-[0.85em] mt-0.5">{card.suit}</span>
      </div>
      <div className={`absolute inset-0 flex items-center justify-center ${sz.center} ${color}`}>{card.suit}</div>
      <div className={`absolute bottom-1.5 right-1.5 flex flex-col items-center leading-none rotate-180 ${color} ${sz.rank}`}>
        <span>{card.rank}</span>
        <span className="text-[0.85em] mt-0.5">{card.suit}</span>
      </div>
    </div>
  );
}
