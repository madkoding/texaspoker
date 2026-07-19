import { useEffect, useState } from "react";

interface Props {
  /** Seconds each player has to act. 0 disables the timer. */
  duration: number;
  /** Reset the timer (typically changes when the turn changes). */
  resetKey: string | number;
}

/**
 * Countdown timer shown while a player is on turn. When 5 seconds remain it
 * pulses red. Auto-fires onComplete at 0 (caller can wire action).
 */
export function TurnTimer({ duration, resetKey }: Props) {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    setRemaining(duration);
    if (duration <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resetKey, duration]);

  if (duration <= 0) return null;
  if (remaining <= 0) return null;

  const pct = remaining / duration;
  const isUrgent = remaining <= 5;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * pct;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-felt-dark/90 text-cream font-display text-sm shadow-lift ${
        isUrgent ? "animate-timer-warning" : ""
      }`}
      title={`${remaining}s para actuar`}
    >
      <svg width="22" height="22" viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={isUrgent ? "#c0392b" : "#f1d26a"}
          strokeWidth="4"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s linear" }}
        />
      </svg>
      <span className={`tabular-nums ${isUrgent ? "text-pokerred font-bold" : "text-gold-light"}`}>
        {remaining}s
      </span>
    </div>
  );
}
