interface CardSample {
  v: string;
  s: "♠" | "♥" | "♦" | "♣";
}

interface Hand {
  rank: number;
  name: string;
  en: string;
  desc: string;
  cards: CardSample[];
  prob: string;
}

const HANDS: Hand[] = [
  {
    rank: 1,
    name: "Escalera Real",
    en: "Royal Flush",
    desc: "Las cinco cartas más altas (A, K, Q, J, 10) todas del mismo palo. Es la mano más alta y difícil de conseguir.",
    cards: [
      { v: "A", s: "♠" }, { v: "K", s: "♠" }, { v: "Q", s: "♠" }, { v: "J", s: "♠" }, { v: "10", s: "♠" },
    ],
    prob: "1 entre 649.740",
  },
  {
    rank: 2,
    name: "Escalera de Color",
    en: "Straight Flush",
    desc: "Cinco cartas consecutivas del mismo palo. Si dos jugadores la tienen, gana quien tenga la carta más alta.",
    cards: [
      { v: "9", s: "♥" }, { v: "8", s: "♥" }, { v: "7", s: "♥" }, { v: "6", s: "♥" }, { v: "5", s: "♥" },
    ],
    prob: "1 entre 72.193",
  },
  {
    rank: 3,
    name: "Póker",
    en: "Four of a Kind",
    desc: "Cuatro cartas del mismo valor. Si dos jugadores tienen póker, gana quien tenga el valor más alto.",
    cards: [
      { v: "K", s: "♠" }, { v: "K", s: "♥" }, { v: "K", s: "♦" }, { v: "K", s: "♣" }, { v: "7", s: "♠" },
    ],
    prob: "1 entre 4.165",
  },
  {
    rank: 4,
    name: "Full",
    en: "Full House",
    desc: "Un trío combinado con un par. Si hay empate, gana quien tenga el trío de mayor valor.",
    cards: [
      { v: "Q", s: "♠" }, { v: "Q", s: "♥" }, { v: "Q", s: "♦" }, { v: "4", s: "♣" }, { v: "4", s: "♠" },
    ],
    prob: "1 entre 694",
  },
  {
    rank: 5,
    name: "Color",
    en: "Flush",
    desc: "Cinco cartas del mismo palo, sin importar el orden. En caso de empate, gana quien tenga la carta más alta.",
    cards: [
      { v: "A", s: "♦" }, { v: "J", s: "♦" }, { v: "8", s: "♦" }, { v: "5", s: "♦" }, { v: "3", s: "♦" },
    ],
    prob: "1 entre 509",
  },
  {
    rank: 6,
    name: "Escalera",
    en: "Straight",
    desc: "Cinco cartas consecutivas de diferentes palos. El As puede ser la carta más alta o la más baja (A-2-3-4-5).",
    cards: [
      { v: "10", s: "♠" }, { v: "9", s: "♥" }, { v: "8", s: "♦" }, { v: "7", s: "♣" }, { v: "6", s: "♠" },
    ],
    prob: "1 entre 255",
  },
  {
    rank: 7,
    name: "Trío",
    en: "Three of a Kind",
    desc: "Tres cartas del mismo valor. Los desempates se resuelven con las dos cartas restantes (kickers).",
    cards: [
      { v: "8", s: "♠" }, { v: "8", s: "♥" }, { v: "8", s: "♦" }, { v: "K", s: "♣" }, { v: "3", s: "♠" },
    ],
    prob: "1 entre 47",
  },
  {
    rank: 8,
    name: "Doble Par",
    en: "Two Pair",
    desc: "Dos pares de cartas del mismo valor. Se desempata primero por el par mayor, luego el menor y finalmente el kicker.",
    cards: [
      { v: "10", s: "♠" }, { v: "10", s: "♥" }, { v: "5", s: "♦" }, { v: "5", s: "♣" }, { v: "A", s: "♠" },
    ],
    prob: "1 entre 21",
  },
  {
    rank: 9,
    name: "Par",
    en: "One Pair",
    desc: "Dos cartas del mismo valor. Es la combinación más frecuente en partidas iniciales. El kicker decide los empates.",
    cards: [
      { v: "A", s: "♠" }, { v: "A", s: "♥" }, { v: "K", s: "♦" }, { v: "8", s: "♣" }, { v: "3", s: "♠" },
    ],
    prob: "1 entre 2.4",
  },
  {
    rank: 10,
    name: "Carta Alta",
    en: "High Card",
    desc: "Ninguna combinación. Gana quien tenga la carta más alta. Si empatan, se comparan la segunda, tercera, etc.",
    cards: [
      { v: "A", s: "♠" }, { v: "J", s: "♥" }, { v: "9", s: "♦" }, { v: "6", s: "♣" }, { v: "3", s: "♠" },
    ],
    prob: "1 entre 2",
  },
];

interface Props {
  onBack: () => void;
}

export function HandGuide({ onBack }: Props) {
  return (
    <div className="min-h-screen text-coffee-50">
      <header className="bg-gradient-to-br from-felt-dark to-felt text-cream py-12 px-6 text-center border-b-4 border-gold relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-cream/[0.04] text-[18rem] tracking-[2.5rem] whitespace-nowrap">
          ♠ ♥ ♦ ♣
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold relative z-10">
          Combinaciones del <span className="text-gold-light">Póker</span>
        </h1>
        <p className="mt-3 text-cream/80 relative z-10">
          Guía visual con las 10 manos ordenadas de mayor a menor valor
        </p>
        <button
          className="mt-5 btn-gold relative z-10"
          onClick={() => window.print()}
        >
          🖨️ Imprimir guía
        </button>
        <button
          className="mt-5 ml-3 btn-ghost !bg-cream/10 !text-cream hover:!bg-cream/20 relative z-10"
          onClick={onBack}
        >
          ← Volver
        </button>
      </header>

      <main className="max-w-6xl mx-auto -mt-10 px-6 pb-16 relative z-20">
        <div className="card-white p-6 mb-10 border-l-4 border-gold">
          <h2 className="font-display text-xl text-felt-dark mb-2">¿Cómo se ordenan las manos?</h2>
          <p className="text-sm text-ink/70">
            En el póker, cada combinación tiene un valor determinado por su <strong>rareza estadística</strong>:
            cuanto más difícil es obtenerla, más alta es su jerarquía. A continuación encontrarás las
            10 manos posibles, desde la mítica <em>Escalera Real</em> hasta la simple <em>Carta Alta</em>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {HANDS.map((h) => (
            <article
              key={h.rank}
              className="card-white p-6 flex flex-col border-t-4 border-gold hover:-translate-y-1 transition-transform"
            >
              <header className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-felt text-gold-light font-bold text-lg flex items-center justify-center border-2 border-gold">
                  {h.rank}
                </div>
                <div>
                  <h3 className="font-display text-lg text-felt-dark">{h.name}</h3>
                  <p className="text-xs italic text-ink/50">{h.en}</p>
                </div>
              </header>
              <p className="text-sm text-ink/70 mb-4">{h.desc}</p>
              <div className="flex flex-wrap gap-1.5 justify-center mt-auto">
                {h.cards.map((c, i) => {
                  const isRed = c.s === "♥" || c.s === "♦";
                  return (
                    <div
                      key={i}
                      className="w-14 h-20 rounded-md bg-white border border-black/30 shadow-card relative font-display"
                    >
                      <div className={`absolute top-1 left-1 text-[10px] font-bold leading-tight flex flex-col items-center ${isRed ? "text-pokerred" : "text-ink"}`}>
                        <span>{c.v}</span>
                        <span>{c.s}</span>
                      </div>
                      <div className={`absolute inset-0 flex items-center justify-center text-2xl ${isRed ? "text-pokerred" : "text-ink"}`}>
                        {c.s}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-black/15 text-xs text-center text-ink/50">
                Probabilidad aproximada: <strong className="text-felt">{h.prob}</strong>
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className="bg-felt-dark text-cream text-center py-8 px-4 text-sm">
        <p className="max-w-3xl mx-auto opacity-80">
          <strong className="text-gold-light">💡 Regla de oro:</strong> Si dos jugadores tienen la misma
          combinación, gana quien tenga las cartas de mayor valor dentro de ella. La quinta carta auxiliar
          se conoce como <em>"kicker"</em> y sirve para desempatar.
        </p>
      </footer>
    </div>
  );
}
