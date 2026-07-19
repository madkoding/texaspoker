import { useEffect, useRef, useState } from "react";
import { PokerTable } from "../components/PokerTable";
import { ActionPanel } from "../components/ActionPanel";
import { TurnTimer } from "../components/TurnTimer";
import { ActionStamps } from "../components/ActionStamps";
import { useGameState } from "../hooks/useGameState";
import { useStateSounds, useAudioUnlock } from "../utils/soundHooks";
import { sfx, setMuted } from "../utils/sound";
import { ActionType, Card, LogEntry, PublicState } from "../types";

interface Props {
  playerName: string;
  myId: string;
  roomId: string;
  onLeave: () => void;
  onGuide: () => void;
}

const TURN_SECONDS = 20;

// Responsive font scale used across the GameRoom.
function useScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Scale down a bit on very small screens, keep 1 otherwise.
      const s = Math.min(1, width / 1100, height / 750);
      setScale(Math.max(0.72, s));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return scale;
}

export function GameRoom({ playerName, myId, roomId, onLeave, onGuide }: Props) {
  const { state, myHand, send, connected, error, thinkingBot } = useGameState();
  const scale = useScale();
  const [copied, setCopied] = useState(false);
  const [addingBots, setAddingBots] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [muted, setMutedState] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);
  const lastJoinedRoomRef = useRef<string | null>(null);

  useStateSounds(state);
  useAudioUnlock();

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current != null) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!connected) return;
    if (!roomId) return;
    if (lastJoinedRoomRef.current === roomId) return;
    lastJoinedRoomRef.current = roomId;
    send({ type: "join", roomId, name: playerName });
    if (sessionStorage.getItem("texaspoker.solo") === "1") {
      sessionStorage.removeItem("texaspoker.solo");
      setTimeout(() => {
        send({ type: "add-bots", count: 8 });
      }, 200);
    }
  }, [connected, roomId, playerName, send]);

  useEffect(() => {
    if (state && state.players.length > 1) setAddingBots(false);
  }, [state?.players.length]);

  const currentPlayer = state?.players.find((p) => p.isTurn);
  const timerKey = currentPlayer?.id ?? state?.handNumber ?? "none";

  const handleAction = (action: ActionType, amount?: number) => {
    sfx.chip();
    setTimeout(() => send({ type: "action", action, amount }), 800);
  };

  const toggleMute = () => {
    const newVal = !muted;
    setMutedState(newVal);
    setMuted(newVal);
  };

  const showRoomCode = roomId || "…";

  return (
    <div
      className="h-screen min-h-0 flex flex-col overflow-hidden bg-wood-pattern"
      style={{ fontSize: `${scale}rem` }}
    >
      <header className="shrink-0 h-11 bg-gradient-to-r from-felt-dark via-felt to-felt-dark text-cream px-4 flex items-center justify-between border-b-[3px] border-gold relative z-50 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-xs">
              ♠
            </div>
            <h1 className="font-display text-sm whitespace-nowrap">
              Sala <span className="text-gold-light">{showRoomCode}</span>
            </h1>
          </div>
          {currentPlayer && <TurnTimer duration={TURN_SECONDS} resetKey={timerKey} />}
          <span className="text-[10px] text-cream/60 hidden sm:inline">
            {connected ? "● Conectado" : "○ Reconectando…"}
            {error && <span className="text-pokerred ml-2">· {error}</span>}
          </span>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button className="btn-ghost !text-[11px] !px-2.5 !py-1 !bg-cream/10 !text-cream hover:!bg-cream/20" onClick={toggleMute} title={muted ? "Activar sonido" : "Silenciar"}>
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            className="btn-ghost !text-[11px] !px-2.5 !py-1 !bg-cream/10 !text-cream hover:!bg-cream/20"
            disabled={!roomId}
            onClick={() => {
              if (!roomId) return;
              navigator.clipboard.writeText(roomId);
              setCopied(true);
              if (copiedTimerRef.current != null) clearTimeout(copiedTimerRef.current);
              copiedTimerRef.current = window.setTimeout(() => {
                setCopied(false);
                copiedTimerRef.current = null;
              }, 1500);
            }}
          >
            {copied ? "¡Copiado!" : "Compartir"}
          </button>
          <button className="btn-ghost !text-[11px] !px-2.5 !py-1 !bg-cream/10 !text-cream hover:!bg-cream/20" onClick={onGuide}>
            📖 Guía
          </button>
          <button
            className="btn-danger !text-[11px] !px-2.5 !py-1"
            onClick={() => {
              send({ type: "leave" });
              lastJoinedRoomRef.current = null;
              onLeave();
            }}
          >
            Salir
          </button>
        </div>
      </header>

      {state && <ActionStamps state={state} myId={myId} />}

      <div className="flex-1 min-h-0 flex flex-col items-stretch justify-start px-2 pt-2 pb-2 gap-2 relative">
        {state ? (
          <>
            <TableFrame>
              <PokerTable state={state} myId={myId} thinkingBot={thinkingBot} />
            </TableFrame>

            {/* Floating bottom panel — does NOT affect table sizing */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-end justify-center gap-2 w-[95%] max-w-5xl pointer-events-none">
              <div className="pointer-events-auto">
                <MyHandWindow myHand={myHand} state={state} scale={scale} />
              </div>
              <div className="flex-1 min-w-0 max-w-3xl pointer-events-auto">
                <ActionPanel state={state} myId={myId} onAction={handleAction} scale={scale} />
              </div>
              <div className="pointer-events-auto">
                <HandControls
                  state={state}
                  addingBots={addingBots}
                  scale={scale}
                  onStart={() => {
                    sfx.deal();
                    send({ type: "start" });
                  }}
                  onNext={() => {
                    sfx.deal();
                    send({ type: "next" });
                  }}
                  onAddBots={() => {
                    setAddingBots(true);
                    send({ type: "add-bots", count: 6 });
                  }}
                  onToggleLog={() => setLogOpen((v) => !v)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="card-white px-6 py-4 text-ink/60 rounded-xl">Cargando mesa…</div>
        )}

        {/* Floating log panel (right) */}
        {logOpen && <LogPanel state={state} onClose={() => setLogOpen(false)} />}
      </div>
    </div>
  );
}

/**
 * MyHandWindow: shows the human's hole cards in a small floating window
 * below the action panel. Cards are hidden on the table itself.
 */
function MyHandWindow({
  myHand,
  state,
  scale,
}: {
  myHand: { hand: string; cards: [Card, Card] } | null;
  state: PublicState;
  scale: number;
}) {
  const mePlayer = state.players.find((p) => p.holeCards);
  const hasHand = myHand && myHand.cards && state.street !== "waiting" && state.players.length > 1;
  const folded = mePlayer?.folded;

  return (
    <div
      className="card-white p-2 w-28 shrink-0 pointer-events-auto animate-fade-up border border-gold/20"
      style={{ fontSize: `${scale * 0.85}rem` }}
    >
      <div className="text-[10px] uppercase tracking-widest text-ink/50 text-center mb-1 font-display">Mi mano</div>
      {folded ? (
        <div className="text-center text-pokerred text-[11px] font-semibold py-2">Retirado</div>
      ) : hasHand ? (
        <>
          <div className="flex justify-center gap-0.5">
            {myHand!.cards.map((c, i) => {
              const isRed = c.suit === "♥" || c.suit === "♦";
              return (
                <div
                  key={i}
                  className="w-8 h-11 rounded-md border border-black/20 bg-gradient-to-br from-white to-cream shadow-card flex flex-col items-center justify-center text-[10px] leading-none font-display font-bold"
                >
                  <span className={isRed ? "text-pokerred" : "text-ink"}>{c.rank}</span>
                  <span className={isRed ? "text-pokerred" : "text-ink"}>{c.suit}</span>
                </div>
              );
            })}
          </div>
          {state.street !== "showdown" && state.street !== "waiting" && myHand!.hand !== "—" && (
            <div className="text-[10px] text-felt-dark text-center mt-1 font-display font-semibold leading-tight">
              {myHand!.hand}
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-ink/40 text-[11px] py-2">Esperando…</div>
      )}
    </div>
  );
}

/** Hand controls: deal / next / add-bots + log toggle. */
function HandControls({
  state,
  addingBots,
  scale,
  onStart,
  onNext,
  onAddBots,
  onToggleLog,
}: {
  state: PublicState;
  addingBots: boolean;
  scale: number;
  onStart: () => void;
  onNext: () => void;
  onAddBots: () => void;
  onToggleLog: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-1.5 shrink-0 items-stretch w-24 pointer-events-auto animate-fade-up"
      style={{ fontSize: `${scale * 0.85}rem` }}
    >
      {state && !state.started && (
        <div className="card-white p-1.5">
          {state.players.length >= 2 && state.handNumber === 0 && (
            <button className="btn-gold w-full !text-[11px] !py-1" onClick={onStart}>
              Repartir
            </button>
          )}
          {state.players.length >= 2 && state.handNumber > 0 && (
            <button className="btn-gold w-full !text-[11px] !py-1" onClick={onNext}>
              Siguiente
            </button>
          )}
          {state.players.length === 1 && (
            <button
              className="btn-gold w-full !text-[11px] !py-1 disabled:opacity-50"
              disabled={addingBots}
              onClick={onAddBots}
            >
              {addingBots ? "Añadiendo…" : "Bots"}
            </button>
          )}
          {state.players.length === 0 && (
            <p className="text-[9px] text-ink/50 text-center">Esperando…</p>
          )}
        </div>
      )}

      <button
        onClick={onToggleLog}
        className="card-white px-2 py-1 text-[10px] flex items-center justify-center gap-1 hover:bg-felt-dark/5"
        title="Registro"
      >
        <span>📋 Registro</span>
        <span className="bg-felt-dark text-cream text-[8px] rounded-full px-1 min-w-[14px] text-center">
          {state.log?.length ?? 0}
        </span>
      </button>
    </div>
  );
}

/** Log panel: floating right side. */
function LogPanel({ state, onClose }: { state: PublicState | null; onClose: () => void }) {
  return (
    <div className="fixed bottom-3 right-3 z-40 w-80 max-h-[60vh] card-white p-2 shadow-lift flex flex-col animate-fade-up">
      <div className="flex items-center justify-between mb-1 shrink-0">
        <div className="text-[10px] uppercase tracking-widest text-ink/50">Registro</div>
        <button onClick={onClose} className="text-ink/50 hover:text-ink text-sm">×</button>
      </div>
      <ul className="flex-1 min-h-0 overflow-y-auto text-[11px] space-y-0.5 pr-1">
        <LogList log={state?.log ?? []} />
      </ul>
    </div>
  );
}

function LogList({ log }: { log: LogEntry[] }) {
  if (log.length === 0) {
    return <li className="text-ink/40 italic">Sin mensajes.</li>;
  }
  return (
    <>
      {log.map((l) => (
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
      ))}
    </>
  );
}

/**
 * TableFrame: a flex-1 container that sizes the poker table to fit the
 * available space (viewport minus header + bottom controls). The table
 * keeps a 16:10 aspect ratio and shrinks proportionally with the window.
 *
 * The inner PokerTable is rendered at its design size (BASE_W x BASE_H)
 * and then scaled with `transform: scale()` so cards, chips and seats
 * all resize together as the window changes.
 */
const BASE_W = 960;
const BASE_H = 600;

function TableFrame({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [avail, setAvail] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setAvail({ w: rect.width, h: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

    // The table uses the full available flex area; the bottom controls are
    // floating and should not reduce the table size.
    const { w: tableW, h: tableH, scale } = (() => {
      if (!avail) return { w: 0, h: 0, scale: 1 };
      const maxW = Math.min(BASE_W, avail.w * 0.98);
      const maxH = avail.h * 0.98;
      const wByWidth = maxW;
      const hByWidth = wByWidth * (BASE_H / BASE_W);
      let w: number;
      let h: number;
      if (hByWidth <= maxH) {
        w = wByWidth;
        h = hByWidth;
      } else {
        h = maxH;
        w = h * (BASE_W / BASE_H);
      }
      return { w, h, scale: w / BASE_W };
    })();

    return (
      <div
        ref={ref}
        className="relative flex-1 min-h-0 flex items-start justify-center animate-fade-up overflow-hidden"
      >
        {avail && (
          <div
            data-testid="poker-table"
            className="relative rounded-[50%] border-[8px] border-felt-dark overflow-hidden shadow-rim shadow-table"
            style={{ width: `${tableW}px`, height: `${tableH}px` }}
          >
            <div
              className="absolute top-1/2 left-1/2 origin-center"
              style={{
                width: `${BASE_W}px`,
                height: `${BASE_H}px`,
                transform: `translate(-50%, -50%) scale(${scale})`,
              }}
            >
              {children}
            </div>
          </div>
        )}
      </div>
    );
  }
