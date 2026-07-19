import { useState } from "react";

interface Props {
  onSubmit: (name: string) => void;
  initial?: string;
}

export function NamePrompt({ onSubmit, initial = "" }: Props) {
  const [name, setName] = useState(initial);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-felt-dark to-felt p-6 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-cream/[0.04] text-[16rem] tracking-[2rem] whitespace-nowrap">
        ♠ ♥ ♦ ♣
      </div>
      <div className="card-white p-8 max-w-md w-full relative z-10 border border-gold/30 shadow-lift">
        <h1 className="font-display text-4xl text-felt-dark text-center mb-1">
          Texas <span className="text-gold">Poker</span>
        </h1>
        <p className="text-center text-ink/60 text-sm mb-6">Multiplayer · WebSockets · Texas Hold'em</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length >= 2) onSubmit(name.trim().slice(0, 16));
          }}
          className="space-y-4"
        >
          <label className="block text-sm font-medium text-ink/70">Elige tu nombre de jugador</label>
          <input
            autoFocus
            className="input text-center text-lg"
            maxLength={16}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="p. ej. Maverick"
          />
          <button type="submit" className="btn-gold w-full !py-3" disabled={name.trim().length < 2}>
            Entrar al lobby
          </button>
        </form>
        <p className="text-[11px] text-ink/40 text-center mt-4">
          Se asignará un ID aleatorio y se guardará en este navegador.
        </p>
      </div>
    </div>
  );
}
