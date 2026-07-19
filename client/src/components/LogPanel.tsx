import { useState } from "react";
import { LogEntry } from "../types";

interface Props {
  log: LogEntry[];
}

export function LogPanel({ log }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Toggle button (visible on lg only, hidden on xl since sidebar shows) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-3 right-3 z-40 lg:flex xl:hidden w-11 h-11 rounded-full bg-felt-dark text-cream shadow-lift hover:bg-felt items-center justify-center text-sm"
        title="Ver registro"
      >
        📋
        {log.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-gold text-felt-dark text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {log.length > 99 ? "99+" : log.length}
          </span>
        )}
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed bottom-16 right-3 z-40 w-80 max-h-[60vh] card-white p-2 shadow-lift lg:flex xl:hidden flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] uppercase tracking-widest text-ink/50">
              Registro ({log.length})
            </div>
            <button onClick={() => setOpen(false)} className="text-ink/50 hover:text-ink text-sm">×</button>
          </div>
          <ul className="overflow-y-auto text-[11px] space-y-0.5 pr-1 max-h-[50vh]">
            {log.length === 0 ? (
              <li className="text-ink/40 italic">Sin mensajes.</li>
            ) : (
              log.map((l) => (
                <li
                  key={l.id}
                  className={`leading-snug ${
                    l.kind === "win"
                      ? "text-gold-dark font-semibold"
                      : l.kind === "system"
                      ? "text-ink/40"
                      : "text-ink/70"
                  }`}
                >
                  <span className="text-ink/30 mr-1">·</span>
                  {l.message}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </>
  );
}
