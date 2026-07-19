export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank =
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type HandName =
  | "Escalera Real"
  | "Escalera de Color"
  | "Póker"
  | "Full"
  | "Color"
  | "Escalera"
  | "Trío"
  | "Doble Par"
  | "Par"
  | "Carta Alta";

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown" | "waiting";

export type ActionType = "fold" | "check" | "call" | "bet" | "raise" | "all-in";

export interface PublicPlayer {
  id: string;
  name: string;
  chips: number;
  bet: number;
  folded: boolean;
  allIn: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isTurn: boolean;
  hasCards: boolean;
  holeCards?: [Card, Card];
  lastAction?: ActionType | null;
  seatIndex: number;
  isBot?: boolean;
}

export interface PrivatePlayer extends PublicPlayer {
  holeCards: [Card, Card];
}

export interface PublicState {
  roomId: string;
  street: Street;
  community: Card[];
  pot: number;
  currentBet: number;
  minRaise: number;
  dealer: number;
  smallBlind: number;
  bigBlind: number;
  players: PublicPlayer[];
  communityCardsRevealed: number;
  winners?: { id: string; name: string; hand: HandName; amount: number; cards: [Card, Card] }[];
  log: LogEntry[];
  started: boolean;
  handNumber: number;
}

export interface LogEntry {
  id: string;
  message: string;
  ts: number;
  kind?: "info" | "win" | "action" | "system";
}

export interface ClientToServer {
  type: "join" | "leave" | "create" | "list" | "ready" | "start" | "action" | "sitOut" | "rebuy" | "next" | "add-bots";
  roomId?: string;
  name?: string;
  action?: ActionType;
  amount?: number;
  seatIndex?: number;
  clientId?: string;
  count?: number;
}

export interface ServerToClient {
  type: "state" | "error" | "rooms" | "hand-result" | "system" | "bot-thinking";
  state?: PublicState;
  rooms?: { id: string; players: number; maxPlayers: number; started: boolean }[];
  message?: string;
  you?: { id: string; hand: HandName; cards: [Card, Card] } | null;
  error?: string;
  // bot-thinking payload
  name?: string;
  id?: string;
}
