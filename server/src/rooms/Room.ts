import { WebSocket } from "ws";
import { GameEngine } from "../engine/GameEngine.js";
import { createLogger } from "../logger.js";
import { ClientToServer, ServerToClient } from "../types/index.js";

const log = createLogger("room");

interface Client {
  id: string;
  name: string;
  socket: WebSocket;
  roomId: string | null;
}

export class Room {
  id: string;
  engine: GameEngine;
  clients: Map<string, Client> = new Map();
  createdAt = Date.now();

  constructor(id: string) {
    this.id = id;
    this.engine = new GameEngine(id, { smallBlind: 5, bigBlind: 10, startingChips: 1000 });
    this.engine.resetSeats(7);
    // When the engine asks for a bot to be announced as "thinking", the room
    // can fan out a transient message to clients.
    this.engine.onBotTurnStart = (name, id) => {
      log.debug("bot thinking", { name, id });
      for (const c of this.clients.values()) {
        this.send(c, { type: "bot-thinking", name, id });
      }
    };
  }

  addClient(client: Client) {
    this.clients.set(client.id, client);
  }

  removeClient(clientId: string) {
    const c = this.clients.get(clientId);
    if (!c) return;
    this.engine.removePlayer(c.id);
    this.clients.delete(clientId);
  }

  broadcast(senderId?: string) {
    for (const c of this.clients.values()) {
      this.sendState(c);
    }
    // After any state change, schedule the next bot if it's their turn.
    this.scheduleNextBot();
    // Let lobby clients know the room list changed.
    this.onRoomListChanged?.();
  }

  onRoomListChanged?: () => void;

  // Send the public state plus, for any bots whose turn it is, schedule them
  // with a realistic delay so the table feels alive. Bots act one at a time,
  // separated by ~1.2-2.2s of "thinking" so the human can read each action.
  scheduleNextBot() {
    if (!this.engine.started) return;
    if (this.engine.street === "showdown" || this.engine.street === "waiting") return;
    const p = this.engine.players[this.engine.toAct];
    if (!p || !p.id.startsWith("bot-")) return;
    if (p.folded || p.allIn) return;
    this.engine.scheduleCurrentBotTurn(() => this.broadcast());
  }

  send(c: Client, msg: ServerToClient) {
    try {
      c.socket.send(JSON.stringify(msg));
    } catch {}
  }

  sendState(c: Client) {
    const state = this.engine.toPublicState(c.id);
    const hand = this.engine.privateHandFor(c.id);
    const msg: ServerToClient = { type: "state", state, you: hand };
    this.send(c, msg);
  }

  handle(client: Client, msg: ClientToServer) {
    log.debug("handle", { type: msg.type, clientId: client.id, roomId: this.id });
    if (msg.type === "join" && msg.roomId) {
      this.joinRoom(client, msg.name ?? "Anónimo");
      return;
    }
    if (msg.type === "start") {
      this.engine.startHand();
      this.broadcast();
      return;
    }
    if (msg.type === "next") {
      this.engine.nextHand();
      this.broadcast();
      return;
    }
    if (msg.type === "action" && msg.action) {
      const res = this.engine.applyAction(client.id, msg.action, msg.amount);
      if (!res.ok) {
        log.debug("action rejected", { clientId: client.id, reason: res.reason });
        this.send(client, { type: "error", error: res.reason });
      } else {
        this.broadcast();
      }
      return;
    }
    if (msg.type === "leave") {
      this.removeClient(client.id);
      client.roomId = null;
      this.broadcast();
      return;
    }
    if (msg.type === "add-bots") {
      const added = this.engine.addBots(msg.count ?? 3);
      log.info("add-bots", { added, total: this.engine.players.length });
      // Auto-start the hand if the human was alone and there are now >= 2 players
      if (!this.engine.started && this.engine.players.length >= 2) {
        this.engine.startHand();
      }
      this.broadcast();
      return;
    }
  }

  joinRoom(client: Client, name: string) {
    log.info("joinRoom", { clientId: client.id, name, roomId: this.id });
    client.name = name;
    client.roomId = this.id;
    const res = this.engine.addPlayer(client.id, name);
    if (!res.ok) {
      log.warn("joinRoom rejected", { clientId: client.id, reason: res.reason });
      this.send(client, { type: "error", error: res.reason });
      return;
    }
    this.clients.set(client.id, client);
    this.broadcast();
  }

  publicInfo() {
    // Count distinct seated humans/bots. If the hand has started, players
    // are the authoritative list; otherwise use the seat config list.
    const seated = this.engine.started
      ? this.engine.players.length
      : this.engine.seats.filter((s) => s !== null).length;
    return {
      id: this.id,
      players: seated,
      maxPlayers: this.engine.seats.length,
      started: this.engine.started,
    };
  }
}
