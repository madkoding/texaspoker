/**
 * Sound effects using the WebAudio API. No external assets required.
 *
 * Each effect is a small set of oscillator + envelope operations. The
 * audio context is created lazily on the first user gesture (most
 * browsers require this to comply with autoplay policies).
 *
 * Sounds:
 *  - deal:     Short white-noise "shff" used when cards are dealt
 *  - chip:     Quick high "tink" (chip clink) for fold/check/call
 *  - bet:      Deeper "thunk" for bet/raise
 *  - all-in:   Two-tone rising sound for all-in
 *  - sweep:    Longer "clack-clack-clack" for chips swept to the pot
 *  - win:      Three ascending tones (cha-ching) for a winner
 *  - tick:     Soft tick for the turn timer
 *  - fold:     Low thud (low-frequency oscillator with quick decay)
 */

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!Ctx) return null;
  ctx = new Ctx();
  return ctx;
}

export function setMuted(v: boolean) {
  muted = v;
}

export function isMuted() {
  return muted;
}

function envelope(
  gain: GainNode,
  attack: number,
  decay: number,
  peak: number,
  startTime: number,
) {
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peak, startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + decay);
}

function tone(
  freq: number,
  durationMs: number,
  type: OscillatorType = "sine",
  peak = 0.18,
  attack = 0.005,
  decay?: number,
) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.connect(g);
  g.connect(c.destination);
  const d = (decay ?? durationMs / 1000) - attack;
  envelope(g, attack, Math.max(0.01, d), peak, t0);
  osc.start(t0);
  osc.stop(t0 + attack + Math.max(0.02, d));
}

function noise(durationMs: number, peak = 0.12, lowpass = 4000) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * (durationMs / 1000)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = lowpass;
  const g = c.createGain();
  src.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  envelope(g, 0.005, durationMs / 1000, peak, t0);
  src.start(t0);
  src.stop(t0 + durationMs / 1000);
}

export const sfx = {
  deal() {
    if (muted) return;
    noise(150, 0.18, 6000);
  },
  chip() {
    if (muted) return;
    tone(1800, 90, "triangle", 0.16, 0.001);
    tone(2400, 60, "sine", 0.10, 0.001);
  },
  bet() {
    if (muted) return;
    tone(220, 180, "square", 0.18, 0.005);
    tone(140, 220, "sine", 0.10, 0.005);
  },
  raise() {
    if (muted) return;
    tone(330, 100, "square", 0.20, 0.005);
    tone(220, 180, "sine", 0.12, 0.005);
    tone(440, 200, "triangle", 0.08, 0.005);
  },
  allIn() {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const t0 = c.currentTime;
    [330, 440, 660, 880].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t0 + i * 0.07);
      osc.connect(g);
      g.connect(c.destination);
      g.gain.setValueAtTime(0, t0 + i * 0.07);
      g.gain.linearRampToValueAtTime(0.18, t0 + i * 0.07 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.07 + 0.18);
      osc.start(t0 + i * 0.07);
      osc.stop(t0 + i * 0.07 + 0.2);
    });
  },
  fold() {
    if (muted) return;
    tone(180, 200, "sine", 0.16, 0.005);
    tone(90, 280, "sine", 0.08, 0.005);
  },
  check() {
    if (muted) return;
    tone(660, 60, "sine", 0.10, 0.005);
  },
  sweep() {
    if (muted) return;
    // 3 quick chip clinks
    [0, 60, 120].forEach((ms) => {
      setTimeout(() => {
        tone(1500, 50, "triangle", 0.14, 0.001);
        tone(2200, 40, "sine", 0.08, 0.001);
      }, ms);
    });
  },
  win() {
    if (muted) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => tone(freq, 180, "triangle", 0.18, 0.005), i * 90);
    });
  },
  tick() {
    if (muted) return;
    tone(1100, 30, "sine", 0.05, 0.001);
  },
  warning() {
    if (muted) return;
    tone(880, 80, "square", 0.10, 0.001);
  },
};

/**
 * Resume the audio context after a user gesture. Browsers require this
 * before any sound can play. Call from a click handler.
 */
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") {
    c.resume().catch(() => {});
  }
}
