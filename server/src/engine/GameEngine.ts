import { buildDeck, shuffle } from "./deck";
import { compareHands, evaluateHand } from "./evaluator";
import { takeBotName } from "./bots";
import { decideBotAction } from "./botStrategy";
import { createLogger, inspect, Logger } from "../logger";
import {
  Card,
  HandName,
  LogEntry,
  PrivatePlayer,
  PublicPlayer,
  PublicState,
  Street,
} from "../types";

const log = createLogger("engine");

interface SeatConfig {
  id: string;
  name: string;
  seatIndex: number;
  chips: number;
  isBot?: boolean;
}

interface Options {
  smallBlind: number;
  bigBlind: number;
  maxPlayers?: number;
  startingChips?: number;
}

const MAX_PLAYERS = 7;

export class GameEngine {
  roomId: string;
  seats: (SeatConfig | null)[] = [];
  players: PrivatePlayer[] = [];
  community: Card[] = [];
  deck: Card[] = [];
  pot = 0;
  currentBet = 0;
  minRaise = 0;
  street: Street = "waiting";
  dealerIdx = 0;
  smallBlindIdx = 1;
  bigBlindIdx = 2;
  toAct = 0;
  smallBlindAmt: number;
  bigBlindAmt: number;
  handNumber = 0;
  log: LogEntry[] = [];
  started = false;
  lastAggressor: number | null = null;
  actedSinceLastBet = new Set<number>();
  communityRevealed = 0;
  winners: PublicState["winners"] = undefined;
  startingChips: number;
  // Number of raises that have happened in the current street. Reset
  // every time we move to the next street. Used to enforce a cap on
  // the number of raises per betting round (standard in limit hold'em,
  // also a common safety rule in no-limit).
  raisesThisStreet = 0;
  // Maximum number of raises allowed per street before the round must
  // end (everyone can only call or fold after this). 3 is a common rule.
  static MAX_RAISES_PER_STREET = 3;
  // Optional callback the engine uses to announce a bot's decision before
  // it lands. Lets the room broadcast a "thinking" state and stagger bot
  // turns so the game feels like a real table.
  onBotTurnStart?: (botName: string, botId: string) => void;
  onBotTurnEnd?: (botName: string, botId: string) => void;
  botTurnTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // When true, the engine schedules each bot turn with a delay so the
  // server broadcasts a "Bot thinking" state in between. The room sets
  // this to true when there are humans connected.
  botsTakeTime = true;
  // Min/max delay in ms for a bot's think time.
  botMinDelayMs = 900;
  botMaxDelayMs = 2200;

  constructor(roomId: string, opts: Options) {
    this.roomId = roomId;
    this.smallBlindAmt = opts.smallBlind;
    this.bigBlindAmt = opts.bigBlind;
    this.startingChips = opts.startingChips ?? 1000;
    this._maxPlayers = opts.maxPlayers ?? MAX_PLAYERS;
    this.resetSeats(this._maxPlayers);
  }

  get maxPlayers() {
    return this._maxPlayers;
  }
  private _maxPlayers: number = MAX_PLAYERS;

  resetSeats(max = MAX_PLAYERS) {
    this._maxPlayers = max;
    this.seats = new Array(max).fill(null);
  }

  addPlayer(id: string, name: string, chips?: number): { ok: boolean; reason?: string; seatIndex?: number } {
    log.debug("addPlayer", { id, name, chips });
    // Dedup against both seated and active players
    if (this.players.some((p) => p.id === id)) {
      const idx = this.players.findIndex((p) => p.id === id);
      log.debug("addPlayer: already in players", { id, idx });
      return { ok: true, seatIndex: idx };
    }
    const existingSeat = this.seats.findIndex((s) => s && s.id === id);
    if (existingSeat !== -1) {
      if (this.seats[existingSeat]) this.seats[existingSeat]!.name = name;
      log.debug("addPlayer: already in seats", { id, seat: existingSeat });
      return { ok: true, seatIndex: existingSeat };
    }
    const emptySeat = this.seats.findIndex((s) => s === null);
    if (emptySeat === -1) {
      log.warn("addPlayer: room full", { id });
      return { ok: false, reason: "Sala llena" };
    }
    const config: SeatConfig = { id, name, seatIndex: emptySeat, chips: chips ?? this.startingChips };
    this.seats[emptySeat] = config;
    log.info("player seated", { id, name, seat: emptySeat, started: this.started });
    if (!this.started) {
      this.logEntry(`${name} se ha sentado en la silla ${emptySeat + 1}`, "system");
      return { ok: true, seatIndex: emptySeat };
    }
    return { ok: false, reason: "Partida en curso, únete cuando termine la mano" };
  }

  // Fill empty seats with bots until we have `target` total seated players
  // (humans + bots). Returns the number of bots added.
  addBots(target: number): number {
    const humanCount = this.seats.filter((s) => s !== null && !s.isBot).length;
    const botCount = this.seats.filter((s) => s !== null && s.isBot).length;
    const total = humanCount + botCount;
    log.debug("addBots", { target, current: { humans: humanCount, bots: botCount } });
    let added = 0;
    while (total + added < target) {
      const empty = this.seats.findIndex((s) => s === null);
      if (empty === -1) break;
      const id = `bot-${Math.random().toString(36).slice(2, 8)}`;
      const name = takeBotName();
      this.seats[empty] = {
        id,
        name,
        seatIndex: empty,
        chips: this.startingChips,
        isBot: true,
      };
      this.logEntry(`🤖 ${name} se ha unido a la mesa`, "system");
      log.info("bot added", { id, name, seat: empty });
      added++;
    }
    if (!this.started) {
      const seated = this.seats.filter((s) => s !== null) as SeatConfig[];
      this.players = seated.map((s) => ({
        id: s.id,
        name: s.name,
        chips: s.chips,
        bet: 0,
        folded: false,
        allIn: false,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
        isTurn: false,
        hasCards: false,
        holeCards: [{ rank: "2", suit: "♠" }, { rank: "2", suit: "♠" }],
        seatIndex: s.seatIndex,
        isBot: !!s.isBot,
      }));
      log.debug("addBots: synced players", { count: this.players.length });
    }
    return added;
  }

  // Run a bot's turn if the current toAct is a bot. Returns true if action was taken.
  processBotTurn(): boolean {
    if (!this.started) return false;
    if (this.street === "showdown" || this.street === "waiting") return false;
    const p = this.players[this.toAct];
    if (!p || !p.id.startsWith("bot-")) return false;
    if (p.folded || p.allIn) return false;

    // Make sure no duplicate timer is in flight for this bot.
    this.cancelBotTimer(p.id);

    const state = this.toPublicState(p.id);
    const me: { id: string; chips: number; bet: number; folded: boolean; allIn: boolean; holeCards: [Card, Card] } = {
      id: p.id,
      chips: p.chips,
      bet: p.bet,
      folded: p.folded,
      allIn: p.allIn,
      holeCards: p.holeCards,
    };
    const decision = decideBotAction({ me, state, community: this.community });
    log.debug("bot turn", { name: p.name, action: decision.type, amount: decision.amount, street: this.street, toCall: state.currentBet - p.bet });
    this.onBotTurnEnd?.(p.name, p.id);
    const res = this.applyAction(p.id, decision.type, decision.amount);
    if (!res.ok) log.warn("bot action rejected", { name: p.name, reason: res.reason });
    return true;
  }

  cancelBotTimer(id: string) {
    const t = this.botTurnTimers.get(id);
    if (t) {
      clearTimeout(t);
      this.botTurnTimers.delete(id);
    }
  }

  cancelAllBotTimers() {
    for (const t of this.botTurnTimers.values()) clearTimeout(t);
    this.botTurnTimers.clear();
  }

  // Backwards-compatible helper: runs all consecutive bot turns
  // synchronously without delays. Used by unit tests and any code that
  // wants the engine to advance to a stable state quickly.
  processAllBotTurns(): number {
    let count = 0;
    let safety = 0;
    while (safety++ < 9) {
      if (!this.processBotTurn()) break;
      count++;
    }
    if (count > 0) log.debug("processAllBotTurns (sync)", { count });
    return count;
  }

  // Schedule the current bot's turn with a small random delay so the table
  // feels like a real game. The caller is expected to have already
  // broadcast the state with the bot marked isTurn. When the timer fires,
  // the bot's action is applied and `afterBot` is invoked (typically used
  // to broadcast the new state and schedule the next bot).
  scheduleCurrentBotTurn(afterBot: () => void) {
    if (!this.started) return;
    if (this.street === "showdown" || this.street === "waiting") return;
    const p = this.players[this.toAct];
    if (!p || !p.id.startsWith("bot-")) return;
    if (p.folded || p.allIn) {
      // Skip: just call afterBot to keep the chain going.
      afterBot();
      return;
    }

    // Make sure no duplicate timer is in flight for this bot.
    this.cancelBotTimer(p.id);

    if (!this.botsTakeTime) {
      this.processBotTurn();
      afterBot();
      return;
    }

    // Random think time so multiple bots in a row don't look robotic.
    const min = this.botMinDelayMs;
    const max = this.botMaxDelayMs;
    const delay = min + Math.random() * (max - min);
    log.debug("scheduling bot turn", { name: p.name, delayMs: Math.round(delay) });
    this.onBotTurnStart?.(p.name, p.id);
    const t = setTimeout(() => {
      this.botTurnTimers.delete(p.id);
      this.processBotTurn();
      afterBot();
    }, delay);
    this.botTurnTimers.set(p.id, t);
  }

  removePlayer(id: string) {
    const idx = this.players.findIndex((p) => p.id === id);
    if (idx >= 0) {
      const p = this.players[idx];
      log.info("player removed from active", { id, name: p.name, bet: p.bet });
      this.cancelBotTimer(p.id);
      this.logEntry(`${p.name} se fue de la mesa`, "system");
      // bet stays in the pot as dead money — standard poker rule
      this.players.splice(idx, 1);
      const seat = this.seats.findIndex((s) => s && s.id === id);
      if (seat >= 0) this.seats[seat] = null;
      // fix indices
      if (this.dealerIdx >= this.players.length) this.dealerIdx = 0;
      if (this.smallBlindIdx >= this.players.length) this.smallBlindIdx = 0;
      if (this.bigBlindIdx >= this.players.length) this.bigBlindIdx = 0;
      if (this.toAct >= this.players.length) this.toAct = 0;
      this.actedSinceLastBet = new Set(
        Array.from(this.actedSinceLastBet)
          .filter((i) => i < idx || i > idx)
          .map((i) => (i > idx ? i - 1 : i))
      );
      if (this.players.length < 2) {
        log.info("ending game: < 2 players");
        this.endGame();
      }
    } else {
      const seat = this.seats.findIndex((s) => s && s.id === id);
      if (seat >= 0) {
        log.info("player removed from seat", { id, seat });
        this.seats[seat] = null;
        this.logEntry(`Asiento ${seat + 1} liberado`, "system");
      }
    }
  }

  startHand() {
    if (this.started) { log.debug("startHand: already started"); return; }
    const seated = this.seats.filter((s) => s !== null) as SeatConfig[];
    if (seated.length < 2) {
      log.warn("startHand: < 2 players", { count: seated.length });
      this.logEntry("Se necesitan al menos 2 jugadores para empezar", "system");
      return;
    }
    this.players = seated.map((s, i) => ({
      id: s.id,
      name: s.name,
      chips: s.chips,
      bet: 0,
      folded: false,
      allIn: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      isTurn: false,
      hasCards: false,
      holeCards: [{ rank: "2", suit: "♠" }, { rank: "2", suit: "♠" }],
      seatIndex: s.seatIndex,
      isBot: !!s.isBot,
    }));
    // Dealer stays at 0 on the very first hand; nextHand() will advance it.
    this.dealerIdx = 0;
    this.started = true;
    this.beginHand();
    // The room is responsible for scheduling any bot that comes next.
  }

  private beginHand() {
    if (this.players.length < 2) {
      this.logEntry("Se necesitan al menos 2 jugadores para repartir", "system");
      this.started = false;
      return;
    }
    this.handNumber += 1;
    this.community = [];
    this.communityRevealed = 0;
    this.pot = 0;
    this.currentBet = this.bigBlindAmt;
    this.minRaise = this.bigBlindAmt;
    this.raisesThisStreet = 0;
    this.winners = undefined;
    this.deck = shuffle(buildDeck());
    this.lastAggressor = null;
    this.actedSinceLastBet = new Set();

    if (this.players.length === 2) {
      this.smallBlindIdx = this.dealerIdx;
      this.bigBlindIdx = (this.dealerIdx + 1) % 2;
    } else {
      this.smallBlindIdx = (this.dealerIdx + 1) % this.players.length;
      this.bigBlindIdx = (this.dealerIdx + 2) % this.players.length;
    }
    this.toAct = (this.bigBlindIdx + 1) % this.players.length;

    for (const p of this.players) {
      p.folded = false;
      p.allIn = false;
      p.bet = 0;
      p.lastAction = null;
      p.hasCards = false;
    }

    this.postBlind(this.smallBlindIdx, this.smallBlindAmt);
    this.postBlind(this.bigBlindIdx, this.bigBlindAmt);

    for (const p of this.players) {
      p.holeCards = [this.deck.pop()!, this.deck.pop()!];
      p.hasCards = true;
    }

    this.street = "preflop";
    log.info("hand begin", { hand: this.handNumber, players: this.players.length, dealer: this.dealerIdx, sb: this.smallBlindIdx, bb: this.bigBlindIdx, toAct: this.toAct });
    this.logEntry(`Mano #${this.handNumber} · ${this.players[this.dealerIdx].name} reparte`, "info");
    this.logEntry(`Blinds: ${this.smallBlindAmt}/${this.bigBlindAmt}`, "info");
  }

  private postBlind(idx: number, amount: number) {
    const p = this.players[idx];
    const pay = Math.min(amount, p.chips);
    p.chips -= pay;
    p.bet = pay;
    this.pot += pay;
    if (p.chips === 0) p.allIn = true;
  }

  applyAction(playerId: string, action: string, amount?: number) {
    if (!this.started) { log.debug("applyAction: not started"); return { ok: false, reason: "La partida no ha comenzado" }; }
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx === -1) { log.debug("applyAction: not found", { playerId }); return { ok: false, reason: "Jugador no encontrado" }; }
    if (idx !== this.toAct) { log.debug("applyAction: not your turn", { playerId, toAct: this.toAct, idx }); return { ok: false, reason: "No es tu turno" }; }
    if (this.players[idx].folded || this.players[idx].allIn) { log.debug("applyAction: cannot act", { playerId }); return { ok: false, reason: "No puedes actuar" }; }

    const p = this.players[idx];
    const toCall = this.currentBet - p.bet;
    log.debug("applyAction", { player: p.name, action, amount, toCall, street: this.street, currentBet: this.currentBet });

    switch (action) {
      case "fold": {
        p.folded = true;
        p.lastAction = "fold";
        this.logEntry(`${p.name} se retira`, "action");
        this.actedSinceLastBet.add(idx);
        break;
      }
      case "check": {
        if (toCall > 0) return { ok: false, reason: "No puedes pasar" };
        p.lastAction = "check";
        this.logEntry(`${p.name} pasa`, "action");
        this.actedSinceLastBet.add(idx);
        break;
      }
      case "call": {
        if (toCall === 0) return { ok: false, reason: "No hay nada que igualar (usa 'check')" };
        const pay = Math.min(toCall, p.chips);
        p.chips -= pay;
        p.bet += pay;
        this.pot += pay;
        if (p.chips === 0) p.allIn = true;
        p.lastAction = "call";
        this.logEntry(`${p.name} iguala ${pay}`, "action");
        this.actedSinceLastBet.add(idx);
        break;
      }
      case "bet": {
        if (this.currentBet > 0) return { ok: false, reason: "Usa 'raise' en lugar de 'bet'" };
        if (this.raisesThisStreet >= GameEngine.MAX_RAISES_PER_STREET) {
          return { ok: false, reason: "Límite de subidas alcanzado en esta calle" };
        }
        const betAmt = Math.max(this.minRaise, amount ?? 0);
        if (betAmt > p.chips) return { ok: false, reason: "Sin fichas suficientes" };
        p.chips -= betAmt;
        p.bet += betAmt;
        this.pot += betAmt;
        this.currentBet = p.bet;
        this.minRaise = betAmt;
        this.raisesThisStreet += 1;
        this.lastAggressor = idx;
        this.actedSinceLastBet = new Set([idx]);
        if (p.chips === 0) p.allIn = true;
        p.lastAction = "bet";
        this.logEntry(`${p.name} apuesta ${betAmt}`, "action");
        break;
      }
      case "raise": {
        if (this.currentBet === 0) return { ok: false, reason: "Usa 'bet' en lugar de 'raise'" };
        const requestedRaise = amount ?? this.currentBet + this.minRaise;
        // Allow all-in for less than the minimum raise
        const isAllInShort = requestedRaise < this.currentBet + this.minRaise && requestedRaise >= p.chips + p.bet;
        const raiseAmt = isAllInShort ? p.chips + p.bet : Math.max(this.currentBet + this.minRaise, requestedRaise);
        const pay = raiseAmt - p.bet;
        if (pay <= 0) return { ok: false, reason: "Cantidad inválida" };
        if (pay > p.chips) return { ok: false, reason: "Sin fichas suficientes" };
        // Reject raises beyond the per-street cap (all-in for less is
        // always allowed; it just won't open action to other players).
        if (!isAllInShort && this.raisesThisStreet >= GameEngine.MAX_RAISES_PER_STREET) {
          return { ok: false, reason: "Límite de subidas alcanzado en esta calle" };
        }
        p.chips -= pay;
        p.bet += pay;
        this.pot += pay;
        if (!isAllInShort) this.minRaise = p.bet - this.currentBet;
        this.currentBet = p.bet;
        if (!isAllInShort) this.raisesThisStreet += 1;
        this.lastAggressor = idx;
        this.actedSinceLastBet = new Set([idx]);
        if (p.chips === 0) p.allIn = true;
        p.lastAction = "raise";
        this.logEntry(`${p.name} sube a ${p.bet}`, "action");
        break;
      }
      case "all-in": {
        const pay = p.chips;
        p.chips = 0;
        p.bet += pay;
        this.pot += pay;
        if (p.bet > this.currentBet) {
          this.minRaise = p.bet - this.currentBet;
          this.currentBet = p.bet;
          this.lastAggressor = idx;
          this.actedSinceLastBet = new Set([idx]);
        } else {
          this.actedSinceLastBet.add(idx);
        }
        p.allIn = true;
        p.lastAction = "all-in";
        this.logEntry(`${p.name} va con todo (${pay})`, "action");
        break;
      }
      default:
        return { ok: false, reason: "Acción inválida" };
    }

    this.advance();
    // Note: the room is responsible for scheduling any bot that comes next.
    return { ok: true };
  }

  private advance() {
    // if only one not folded -> they win
    const live = this.players.filter((p) => !p.folded);
    if (live.length === 1) {
      log.info("advance: only 1 live, ending hand", { winner: live[0].name });
      this.endHand([live[0].id]);
      return;
    }

    // find next player to act (not folded, not all-in)
    let next = (this.toAct + 1) % this.players.length;
    let safety = 0;
    let nextCanAct = -1;
    while (safety++ < this.players.length) {
      const p = this.players[next];
      if (!p.folded && !p.allIn) {
        nextCanAct = next;
        break;
      }
      next = (next + 1) % this.players.length;
    }

    // check if betting round is over:
    // everyone has acted at least once after last bet/raise,
    // and everyone (except all-ins) has bet === currentBet
    const needToAct = this.players.filter((p) => !p.folded && !p.allIn);
    const allMatched = needToAct.every((p) => p.bet === this.currentBet);
    const allActed = needToAct.every((p) => this.actedSinceLastBet.has(this.players.indexOf(p)));

    if (allMatched && allActed) {
      // If nobody can act (everyone is all-in or folded), go straight to showdown
      if (needToAct.length === 0) {
        this.runOutBoard();
      } else {
        this.nextStreet();
      }
    } else if (nextCanAct >= 0) {
      this.toAct = nextCanAct;
    } else {
      // nobody can act but we haven't reached the condition — run out
      this.runOutBoard();
    }
  }

  private runOutBoard() {
    // Deal remaining community cards and go to showdown
    while (this.community.length < 5) this.dealCommunity(1);
    this.showdown();
  }

  private nextStreet() {
    log.info("next street", { from: this.street });
    this.actedSinceLastBet = new Set();
    this.currentBet = 0;
    this.minRaise = this.bigBlindAmt;
    this.raisesThisStreet = 0;
    // Reset per-player current-street bet so the next street's betting logic
    // starts clean. The pot already received each bet when it was placed.
    for (const p of this.players) p.bet = 0;

    switch (this.street) {
      case "preflop":
        this.dealCommunity(3);
        this.street = "flop";
        this.logEntry(`Flop: ${this.community.map((c) => c.rank + c.suit).join(" ")}`, "info");
        break;
      case "flop":
        this.dealCommunity(1);
        this.street = "turn";
        this.logEntry(`Turn: ${this.community[3].rank + this.community[3].suit}`, "info");
        break;
      case "turn":
        this.dealCommunity(1);
        this.street = "river";
        this.logEntry(`River: ${this.community[4].rank + this.community[4].suit}`, "info");
        break;
      case "river":
        this.showdown();
        return;
    }

    // next to act = first live player after dealer. In heads-up (2 players)
    // the dealer/SB acts first post-flop (standard rule).
    const startIdx = this.players.length === 2 ? this.dealerIdx : (this.dealerIdx + 1) % this.players.length;
    let next = startIdx;
    let safety = 0;
    while (safety++ < this.players.length) {
      const p = this.players[next];
      if (!p.folded && !p.allIn) break;
      next = (next + 1) % this.players.length;
    }
    this.toAct = next;
  }

  private dealCommunity(n: number) {
    for (let i = 0; i < n; i++) {
      this.deck.pop();
      this.community.push(this.deck.pop()!);
    }
    this.communityRevealed = this.community.length;
  }

  private showdown() {
    this.street = "showdown";
    this.communityRevealed = 5;
    log.info("showdown", { live: this.players.filter(p => !p.folded).map(p => p.name) });
    this.logEntry("Showdown", "info");
    const live = this.players.filter((p) => !p.folded);
    const evaluated = live.map((p) => ({
      p,
      ev: evaluateHand([...p.holeCards, ...this.community]),
    }));
    evaluated.sort((a, b) => -compareHands(a.ev, b.ev));
    const best = evaluated[0].ev.rank;
    const bestKickers = evaluated[0].ev.kickers;
    const winners = evaluated.filter(
      (e) => e.ev.rank === best && e.ev.kickers.every((k, i) => k === bestKickers[i])
    );
    this.endHand(winners.map((w) => w.p.id), evaluated);
  }

  private endHand(
    winnerIds: string[],
    evaluated?: { p: PrivatePlayer; ev: { name: HandName; rank: number; cards: Card[]; kickers: number[] } }[]
  ) {
    log.info("endHand", { winners: winnerIds, pot: this.pot });
    this.street = "showdown";
    const total = this.pot;
    const n = winnerIds.length;
    const baseShare = Math.floor(total / n);
    const remainder = total - baseShare * n; // give leftover chips to first winner(s)
    const winnerPlayers: NonNullable<PublicState["winners"]> = [];
    for (let i = 0; i < winnerIds.length; i++) {
      const id = winnerIds[i];
      const p = this.players.find((x) => x.id === id)!;
      const extra = i < remainder ? 1 : 0;
      const amount = baseShare + extra;
      p.chips += amount;
      let ev: { name: HandName; rank: number; cards: Card[]; kickers: number[] };
      const found = evaluated?.find((e) => e.p.id === id);
      if (found) {
        ev = found.ev;
      } else if (this.community.length === 5) {
        ev = evaluateHand([...p.holeCards, ...this.community]);
      } else {
        // everyone folded before showdown — winner is just the last standing
        ev = { name: "Carta Alta", rank: 1, cards: p.holeCards, kickers: [] };
      }
      winnerPlayers.push({
        id: p.id,
        name: p.name,
        hand: ev.name,
        amount,
        cards: p.holeCards,
      });
      this.logEntry(`${p.name} gana ${amount} con ${ev.name}`, "win");
    }
    this.winners = winnerPlayers;
    this.pot = 0;
    this.communityRevealed = 5;

    // remove busted players
    this.players = this.players.filter((p) => p.chips > 0);
    for (const p of this.players) {
      const seat = this.seats.findIndex((s) => s && s.id === p.id);
      if (seat >= 0 && this.seats[seat]) this.seats[seat]!.chips = p.chips;
    }
    // mark empty seats
    for (let i = 0; i < this.seats.length; i++) {
      const s = this.seats[i];
      if (s && !this.players.find((p) => p.id === s.id)) this.seats[i] = null;
    }
    this.started = false;
    // No more bot timers should be in flight for this hand.
    this.cancelAllBotTimers();
  }

  private endGame() {
    log.info("endGame");
    this.started = false;
    this.street = "waiting";
    this.pot = 0;
    this.currentBet = 0;
    this.minRaise = this.bigBlindAmt;
    this.community = [];
    this.winners = undefined;
    this.lastAggressor = null;
    this.actedSinceLastBet = new Set();
    if (this.players.length === 1) {
      this.logEntry(`${this.players[0].name} gana la partida`, "win");
    } else {
      this.logEntry("Partida terminada", "system");
    }
  }

  nextHand() {
    if (this.started) { log.debug("nextHand: already started"); return; }
    log.info("nextHand requested", { currentHand: this.handNumber, players: this.players.length, seats: this.seats.filter(s=>s).length });
    // Re-fill players from seats if previous hand left it empty
    if (this.players.length === 0) {
      const seated = (this.seats.filter((s) => s !== null && s.chips > 0) as SeatConfig[]);
      this.players = seated.map((s) => ({
        id: s.id,
        name: s.name,
        chips: s.chips,
        bet: 0,
        folded: false,
        allIn: false,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
        isTurn: false,
        hasCards: false,
        holeCards: [{ rank: "2", suit: "♠" }, { rank: "2", suit: "♠" }],
        seatIndex: s.seatIndex,
      }));
    }
    if (this.players.length < 2) {
      this.logEntry("Se necesitan al menos 2 jugadores con fichas", "system");
      return;
    }
    // Advance the dealer button to the next live player
    this.dealerIdx = (this.dealerIdx + 1) % this.players.length;
    this.started = true;
    this.beginHand();
    // The room is responsible for scheduling any bot that comes next.
  }

  logEntry(message: string, kind: LogEntry["kind"] = "info") {
    this.log.unshift({ id: Math.random().toString(36).slice(2), message, ts: Date.now(), kind });
    if (this.log.length > 60) this.log = this.log.slice(0, 60);
  }

  toPublicState(viewerId?: string): PublicState {
    const state = this._toPublicState(viewerId);
    log.debug("toPublicState", { viewerId, roomId: state.roomId, street: state.street, players: state.players.length, pot: state.pot });
    return state;
  }

  private _toPublicState(viewerId?: string): PublicState {
    let players: PublicPlayer[];
    if (this.started) {
      players = this.players.map((p, i) => {
        // Only the player themselves, or the showdown of non-folded players,
        // can see hole cards. Folded players' cards stay hidden even at showdown.
        const isViewer = !!viewerId && viewerId === p.id;
        const showAtShowdown = this.street === "showdown" && !p.folded;
        return {
          id: p.id,
          name: p.name,
          chips: p.chips,
          bet: p.bet,
          folded: p.folded,
          allIn: p.allIn,
          isDealer: i === this.dealerIdx,
          isSmallBlind: i === this.smallBlindIdx,
          isBigBlind: i === this.bigBlindIdx,
          isTurn: this.started && i === this.toAct && this.street !== "showdown" && !p.folded && !p.allIn,
          hasCards: p.hasCards && (showAtShowdown || isViewer),
          holeCards: (showAtShowdown || isViewer) ? p.holeCards : undefined,
          lastAction: p.lastAction,
          seatIndex: p.seatIndex,
          isBot: p.id.startsWith("bot-"),
        };
      });
    } else {
      players = (this.seats
        .map((s, seatIndex) => s ? {
          id: s.id,
          name: s.name,
          chips: s.chips,
          bet: 0,
          folded: false,
          allIn: false,
          isDealer: false,
          isSmallBlind: false,
          isBigBlind: false,
          isTurn: false,
          hasCards: false,
          holeCards: undefined,
          lastAction: null,
          seatIndex,
          isBot: !!s.isBot,
        } : null)
        .filter(Boolean) as PublicPlayer[]);
    }
    return {
      roomId: this.roomId,
      street: this.street,
      community: this.community,
      pot: this.pot,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      dealer: this.dealerIdx,
      smallBlind: this.smallBlindAmt,
      bigBlind: this.bigBlindAmt,
      players,
      communityCardsRevealed: this.communityRevealed,
      winners: this.winners,
      log: this.log,
      started: this.started,
      handNumber: this.handNumber,
    };
  }

  privateHandFor(playerId: string) {
    const p = this.players.find((x) => x.id === playerId);
    if (!p) return null;
    if (this.community.length < 5 || this.street === "preflop" || this.street === "flop" || this.street === "turn") {
      return { id: p.id, hand: "—" as unknown as HandName, cards: p.holeCards };
    }
    const ev = evaluateHand([...p.holeCards, ...this.community]);
    return { id: p.id, hand: ev.name, cards: p.holeCards } as const;
  }
}
