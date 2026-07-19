import { useEffect, useState } from "react";
import { ActionType, PublicState } from "../types";
import { createLogger } from "../logger";

const log = createLogger("actionpanel");

interface Props {
  state: PublicState;
  myId: string;
  onAction: (action: ActionType, amount?: number) => void;
  scale?: number;
}

export function ActionPanel({ state, myId, onAction, scale = 1 }: Props) {
  const me = state.players.find((p) => p.id === myId);
  const isMyTurn = me && me.isTurn && !me.folded && !me.allIn;
  const toCall = me ? Math.max(0, state.currentBet - me.bet) : 0;
  const canCheck = toCall === 0;
  const isOpening = state.currentBet === 0;
  const minRaise = state.minRaise || state.bigBlind;
  const floor = isOpening ? state.bigBlind : state.currentBet + minRaise;
  const max = me ? Math.max(floor, me.chips) : floor;
  const [slider, setSlider] = useState<number>(floor);

  // Resync slider when minRaise or my chips change (e.g. between streets or after a raise)
  useEffect(() => {
    const newVal = Math.min(Math.max(floor, minRaise), max);
    log.debug("slider resync", { floor, minRaise, max, newVal });
    setSlider(newVal);
  }, [floor, minRaise, max]);

  if (!me) {
    return (
      <div className="card-white p-4 text-center text-sm text-ink/60">
        Sentado en la mesa. Espera a que empiece la partida.
      </div>
    );
  }

  if (state.street === "showdown") {
    if (state.winners && state.winners.length > 0) {
      return (
        <div className="card-white p-4 text-center border-2 border-gold">
          <div className="text-sm uppercase tracking-widest text-gold-dark mb-1">
            {state.winners.length > 1 ? "Ganadores" : "Ganador"}
          </div>
          <div className="font-display text-lg text-felt-dark">
            {state.winners.map((w) => `${w.name} (${w.hand})`).join(" · ")}
          </div>
          <div className="text-xs text-ink/60 mt-1">Premio: ${state.winners[0].amount}</div>
        </div>
      );
    }
  return (
    <div className="card-white p-3 text-center text-sm text-ink/60">
      La mano ha terminado. Pulsa "Siguiente mano" para continuar.
    </div>
  );
}

// Between hands: started=false, street=waiting. The "Repartir/Siguiente mano"
// buttons live in the sidebar of GameRoom, so we show a neutral message here.
if (!state.started) {
  return (
    <div className="card-white p-3 text-center text-sm text-ink/60">
      Esperando que se reparta la siguiente mano…
    </div>
  );
}

if (me.chips === 0 && !me.folded) {
  return (
    <div className="card-white p-3 text-center text-sm text-ink/60">
      Estás all-in. Esperando el showdown…
    </div>
  );
}

  return (
    <div
      className={`card-white p-2 border-l-4 transition-colors shadow-lift ${
        isMyTurn ? "border-l-gold bg-gold/5" : "border-l-felt"
      }`}
      style={{ fontSize: `${scale * 0.9}rem` }}
    >
      <div className="flex items-center justify-between mb-1 text-xs flex-wrap gap-2">
        <div className="text-ink/60">
          Apuesta: <span className="font-semibold text-felt-dark">${state.currentBet}</span>
        </div>
        <div className="text-ink/60">
          Igualar: <span className="font-semibold text-felt-dark">${toCall}</span>
        </div>
        <div className="text-ink/60">
          Fichas: <span className="font-semibold text-gold-dark">${me.chips}</span>
        </div>
      </div>

      {!isMyTurn ? (
        <div className="text-center text-ink/70 text-xs py-2">
          Turno de{" "}
          <span className="font-semibold text-felt-dark">
            {state.players.find((p) => p.isTurn)?.name ?? "—"}
          </span>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 justify-center mb-1.5">
            <button className="btn-danger !px-3 !py-1 !text-xs" onClick={() => onAction("fold")}>
              Retirarse
            </button>
            <button
              className="btn-ghost !px-3 !py-1 !text-xs disabled:opacity-40"
              disabled={!canCheck}
              onClick={() => onAction("check")}
            >
              Pasar
            </button>
            <button
              className="btn-primary !px-3 !py-1 !text-xs disabled:opacity-40"
              disabled={toCall === 0 || me.chips < toCall}
              onClick={() => onAction("call")}
              title={toCall === 0 ? "No hay nada que igualar" : undefined}
            >
              {toCall === 0 ? "Igualar" : `Igualar $${toCall}`}
            </button>
            <button
              className="btn-gold !px-3 !py-1 !text-xs disabled:opacity-40"
              disabled={me.chips === 0}
              onClick={() => onAction("all-in")}
            >
              All-in
            </button>
          </div>

          {me.chips > 0 && (
            <div className="border-t border-black/10 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-ink/50">
                  {isOpening ? "Apostar" : "Subir a"}
                </span>
                <input
                  type="range"
                  min={Math.min(floor, me.chips)}
                  max={me.chips}
                  value={Math.min(Math.max(slider, Math.min(floor, me.chips)), me.chips)}
                  onChange={(e) => setSlider(Number(e.target.value))}
                  className="flex-1 accent-gold"
                />
                <input
                  type="number"
                  className="input w-14 !py-0.5 !px-1"
                  min={Math.min(floor, me.chips)}
                  max={me.chips}
                  value={Math.min(Math.max(slider, Math.min(floor, me.chips)), me.chips)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setSlider(v);
                  }}
                />
                <button
                  className="btn-gold !px-3 !py-1 !text-xs"
                  onClick={() => {
                    const amt = Math.min(Math.max(slider, Math.min(floor, me.chips)), me.chips);
                    onAction(isOpening ? "bet" : "raise", amt);
                  }}
                >
                  {isOpening ? "Apostar" : "Subir"}
                </button>
              </div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {[0.5, 0.75, 1, 1.5, 2].map((m) => (
                  <button
                    key={m}
                    className="text-[9px] px-1.5 py-0.5 rounded-full bg-felt-dark/10 hover:bg-felt-dark/20"
                    onClick={() => setSlider(Math.min(Math.max(Math.floor(me.chips * m), Math.min(floor, me.chips)), me.chips))}
                  >
                    {m === 1 ? "100%" : `${m * 100}%`}
                  </button>
                ))}
                <button
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-felt-dark/10 hover:bg-felt-dark/20"
                  onClick={() => setSlider(Math.min(floor, me.chips))}
                >
                  Mín
                </button>
                <button
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-felt-dark/10 hover:bg-felt-dark/20"
                  onClick={() => setSlider(me.chips)}
                >
                  Máx
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
