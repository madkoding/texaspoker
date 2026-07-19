import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { RoomManager } from "./rooms/RoomManager.js";
import { createLogger } from "./logger.js";
import { ClientToServer, ServerToClient } from "./types/index.js";

const log = createLogger("ws");

const PORT = Number(process.env.PORT ?? 3001);

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, time: Date.now() }));
    return;
  }
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("Texas Poker WebSocket server. Use ws://" + (req.headers.host ?? ""));
});

const wss = new WebSocketServer({ server, path: "/ws" });
const manager = new RoomManager();

interface ClientCtx {
  socket: WebSocket;
  name?: string;
  clientId?: string;
  // Resolved player id (the one we use as the key in the engine).
  // Set once the first message with a clientId arrives, then stable.
  playerId?: string;
  roomId?: string | null;
}

const clients = new Map<WebSocket, ClientCtx>();
const byClientId = new Map<string, WebSocket>();

function send(socket: WebSocket, msg: ServerToClient) {
  if (socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify(msg));
    } catch {}
  }
}

function listRooms(socket: WebSocket) {
  send(socket, { type: "rooms", rooms: manager.list() });
}

function adoptClientId(ctx: ClientCtx, clientId: string | undefined): string | null {
  if (!clientId) return null;
  const previous = byClientId.get(clientId);
  if (previous && previous !== ctx.socket) {
    byClientId.delete(clientId);
    const oldCtx = clients.get(previous);
    if (oldCtx) {
      oldCtx.clientId = undefined;
      oldCtx.playerId = undefined;
      if (oldCtx.roomId) {
        const room = manager.get(oldCtx.roomId);
        room?.removeClient(clientId);
      }
    }
    try { previous.close(); } catch {}
  }
  ctx.clientId = clientId;
  ctx.playerId = clientId;
  byClientId.set(clientId, ctx.socket);
  return clientId;
}

wss.on("connection", (socket) => {
  const ctx: ClientCtx = {
    socket,
    roomId: null,
  };
  clients.set(socket, ctx);
  log.info("connection opened", { clientId: ctx.clientId, playerId: ctx.playerId });
  send(socket, { type: "system", message: "Conectado" });
  listRooms(socket);

  socket.on("message", (raw) => {
    let msg: ClientToServer;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      log.warn("invalid json", { raw: raw.toString().slice(0, 100) });
      send(socket, { type: "error", error: "Mensaje no válido" });
      return;
    }
    log.debug("recv", { type: msg.type, clientId: msg.clientId });

    if (msg.clientId) adoptClientId(ctx, msg.clientId);

    // Stable playerId. Only assigned when a clientId is provided; for
    // anonymous clients we keep the same playerId across messages of this
    // connection so cleanup works correctly.
    if (!ctx.playerId) {
      ctx.playerId = `anon-${Math.random().toString(36).slice(2, 10)}`;
    }
    const playerId = ctx.playerId;
    const name = msg.name ?? ctx.name ?? "Anónimo";
    ctx.name = name;

    if (msg.type === "list") {
      listRooms(socket);
      return;
    }

    if (msg.type === "create") {
      const room = manager.create();
      ctx.roomId = room.id;
      room.joinRoom({ id: playerId, name, socket, roomId: room.id }, name);
      return;
    }

    if (msg.type === "join") {
      const id = (msg.roomId ?? "").toUpperCase();
      const room = manager.get(id);
      if (!room) {
        send(socket, { type: "error", error: "Sala no encontrada" });
        return;
      }
      ctx.roomId = room.id;
      room.joinRoom({ id: playerId, name, socket, roomId: room.id }, name);
      return;
    }

    if (msg.type === "leave") {
      if (ctx.roomId && ctx.playerId) {
        const room = manager.get(ctx.roomId);
        room?.removeClient(ctx.playerId);
        ctx.roomId = null;
      }
      return;
    }

    if (ctx.roomId) {
      const room = manager.get(ctx.roomId);
      if (!room) return;
      room.handle({ id: playerId, name, socket, roomId: ctx.roomId }, msg);
    }
  });

  socket.on("close", () => {
    log.info("connection closed", { clientId: ctx.clientId, playerId: ctx.playerId });
    // Only remove the seat if this socket is still the "active" one for the
    // playerId. If a new socket already took over, do nothing.
    const pid = ctx.playerId;
    if (pid) {
      if (byClientId.get(pid) === socket) {
        byClientId.delete(pid);
        if (ctx.roomId) {
          const room = manager.get(ctx.roomId);
          room?.removeClient(pid);
        }
      }
    }
    clients.delete(socket);
  });
});

server.listen(PORT, () => {
  console.log(`🃏 Texas Poker server listening on http://localhost:${PORT}`);
  console.log(`   WebSocket path: ws://localhost:${PORT}/ws`);
});
