import { useEffect, useState } from "react";
import { useGameState } from "../hooks/useGameState";
import { createLogger } from "../logger";

const log = createLogger("lobby");

interface Props {
  playerName: string;
  myId: string;
  onJoin: (roomId: string) => void;
  onCreate: (roomId: string) => void;
  onGuide: () => void;
}

export function Lobby({ playerName, myId, onJoin, onCreate, onGuide }: Props) {
  const { state, rooms, send, connected, error } = useGameState();
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (connected) {
      log.info("connected, sending list");
      send({ type: "list" });
    }
  }, [connected, send]);

  // When Lobby creates a room, the server replies with `state` containing the
  // real roomId. Navigate to it as soon as it arrives.
  useEffect(() => {
    if (creating && state?.roomId && state.roomId !== "__new__") {
      log.info("room created, navigating", { roomId: state.roomId });
      setCreating(false);
      setCreateError(null);
      onCreate(state.roomId);
    }
  }, [creating, state?.roomId, onCreate]);

  // If we lose the connection while creating, reset the flag so the user can retry
  useEffect(() => {
    if (creating && !connected) {
      const t = setTimeout(() => {
        setCreating(false);
        setCreateError("Se perdió la conexión. Inténtalo de nuevo.");
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [creating, connected]);

  // Watch for server errors while creating
  useEffect(() => {
    if (creating && error) {
      setCreating(false);
      setCreateError(error);
    }
  }, [creating, error]);

  return (
    <div className="min-h-screen text-cream">
      <header className="bg-gradient-to-br from-felt-dark to-felt text-cream py-10 px-6 text-center border-b-4 border-gold relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-cream/[0.04] text-[16rem] tracking-[2rem] whitespace-nowrap">
          ♠ ♥ ♦ ♣
        </div>
        <h1 className="font-display text-4xl md:text-5xl relative z-10">
          Texas <span className="text-gold-light">Poker</span>
        </h1>
        <p className="text-cream/70 text-sm mt-2 relative z-10">
          Hola, <span className="text-gold-light font-semibold">{playerName}</span> · ID <span className="font-mono text-cream/50">{myId}</span>
        </p>
        <div className="mt-2 text-xs text-cream/50 relative z-10">
          {connected ? "🟢 Conectado al servidor" : "🟡 Conectando…"}
          {error && <span className="text-pokerred ml-2">· {error}</span>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <section className="card-white p-6 bg-gradient-to-br from-felt-dark/5 to-gold/10 border border-gold/20">
          <div className="flex items-start gap-3 mb-2">
            <span className="text-2xl">🤖</span>
            <div>
              <h2 className="font-display text-2xl text-felt-dark">Jugar solo</h2>
              <p className="text-sm text-ink/70">
                Empieza una partida tú solo contra 8 bots. Tú actúas, los bots responden.
              </p>
            </div>
          </div>
          <button
            className="btn-gold w-full !text-base !py-3 disabled:opacity-50"
            disabled={!connected || creating}
            onClick={() => {
              if (!connected) return;
              setCreateError(null);
              setCreating(true);
              send({ type: "create", name: playerName });
              // Mark this as a "play solo" run so the next create+auto-start
              // path will also send add-bots.
              sessionStorage.setItem("texaspoker.solo", "1");
            }}
          >
            {creating ? "Creando…" : "Jugar solo contra bots"}
          </button>
        </section>

        <div className="flex items-center gap-3 text-ink/40 text-xs uppercase tracking-widest">
          <div className="flex-1 h-px bg-ink/10" />
          <span>o</span>
          <div className="flex-1 h-px bg-ink/10" />
        </div>

        <section className="card-white p-6">
          <div className="flex items-start gap-3 mb-2">
            <span className="text-2xl">👥</span>
            <div className="flex-1">
              <h2 className="font-display text-xl text-felt-dark mb-1">Crear sala multiplayer</h2>
              <p className="text-sm text-ink/60">
                Hasta 7 jugadores · Apuesta inicial 5/10 · 1000 fichas por jugador
              </p>
            </div>
          </div>
          <button
            className="btn-ghost w-full disabled:opacity-50"
            disabled={!connected || creating}
            onClick={() => {
              if (!connected) return;
              setCreateError(null);
              setCreating(true);
              send({ type: "create", name: playerName });
            }}
          >
            {creating ? "Creando sala…" : "+ Crear sala"}
          </button>
          {createError && (
            <p className="text-xs text-pokerred mt-2">{createError}</p>
          )}
        </section>

        <section className="card-white p-6">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">🔑</span>
            <h2 className="font-display text-xl text-felt-dark">Unirse por código</h2>
          </div>
          <div className="flex gap-2">
            <input
              className="input uppercase tracking-widest text-center text-lg"
              maxLength={5}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
            />
            <button
              className="btn-primary"
              disabled={code.length < 3}
              onClick={() => onJoin(code.toUpperCase())}
            >
              Entrar
            </button>
          </div>
        </section>

        <section className="card-white p-6">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">🌐</span>
            <h2 className="font-display text-xl text-felt-dark">Salas activas</h2>
          </div>
          {rooms && rooms.length > 0 ? (
            <ul className="divide-y divide-black/10">
              {rooms.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-felt/10 flex items-center justify-center font-display text-felt-dark font-bold border border-felt/20">
                      {r.id.slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-display text-felt-dark">{r.id}</div>
                      <div className="text-xs text-ink/60">
                        {r.players}/{r.maxPlayers} jugadores {r.started ? "· en juego" : "· en lobby"}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={() => onJoin(r.id)}
                    disabled={r.players >= r.maxPlayers}
                  >
                    Unirse
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink/50 text-center py-6">
              No hay salas abiertas. Crea una o espera a que alguien entre.
            </p>
          )}
        </section>

        <div className="text-center">
          <button className="btn-ghost" onClick={onGuide}>
            📖 Ver guía de manos
          </button>
        </div>
      </main>
    </div>
  );
}
