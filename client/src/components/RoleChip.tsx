type Role = "D" | "SB" | "BB";

interface Props {
  role: Role;
  /** Diameter of the chip in px. */
  size?: number;
}

const ROLE_INFO: Record<Role, { tooltip: string }> = {
  D: { tooltip: "Dealer (botón)" },
  SB: { tooltip: "Ciega Pequeña" },
  BB: { tooltip: "Ciega Grande" },
};

/**
 * A role indicator (D / SB / BB) rendered as a small white disc with black
 * text, placed right next to the player name.
 */
export function RoleChip({ role, size = 18 }: Props) {
  const info = ROLE_INFO[role];
  return (
    <span
      title={info.tooltip}
      className="inline-flex items-center justify-center rounded-full bg-white border border-black/20 shadow-sm font-display font-bold text-ink leading-none shrink-0"
      style={{ width: size, height: size, fontSize: Math.max(7, size * 0.45) }}
    >
      {role}
    </span>
  );
}
