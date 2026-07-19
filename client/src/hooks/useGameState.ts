import { useEffect, useRef, useState } from "react";
import { PublicState, ServerToClient } from "../types";
import { useSocketContext } from "./SocketProvider";
import { createLogger } from "../logger";

const log = createLogger("app");

type You = NonNullable<ServerToClient["you"]>;

export function useGameState() {
  const { connected, send, subscribe, lastError, clientId } = useSocketContext();
  const [state, setState] = useState<PublicState | null>(null);
  const [myHand, setMyHand] = useState<You | null>(null);
  const [rooms, setRooms] = useState<ServerToClient["rooms"]>([]);
  const [systemMsg, setSystemMsg] = useState<string | null>(null);
  // Bot currently "thinking" — the server emits bot-thinking before the
  // bot's action lands so the client can highlight them.
  const [thinkingBot, setThinkingBot] = useState<{ id: string; name: string } | null>(null);
  const lastStateRef = useRef<PublicState | null>(null);
  const thinkingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    log.info("useGameState mounted");
    return subscribe((msg) => {
      if (msg.type === "state") {
        const prev = lastStateRef.current;
        const next = msg.state ?? null;
        // log only meaningful changes to avoid spam
        if (!prev || !next ||
            prev.street !== next.street ||
            prev.started !== next.started ||
            prev.pot !== next.pot ||
            prev.handNumber !== next.handNumber ||
            prev.players.length !== next.players.length) {
          log.info("state change", next ? { roomId: next.roomId, street: next.street, started: next.started, pot: next.pot, players: next.players.length, hand: next.handNumber } : null);
        } else {
          log.debug("state tick", next ? { street: next.street, pot: next.pot, players: next.players.length } : null);
        }
        lastStateRef.current = next;
        setState(next);
        setMyHand(msg.you ?? null);
      } else if (msg.type === "rooms") {
        log.debug("rooms", { count: msg.rooms?.length });
        setRooms(msg.rooms ?? []);
      } else if (msg.type === "system") {
        log.info("system", { message: msg.message });
        setSystemMsg(msg.message ?? null);
      } else if (msg.type === "bot-thinking") {
        if (msg.id && msg.name) {
          setThinkingBot({ id: msg.id, name: msg.name });
          if (thinkingTimerRef.current != null) clearTimeout(thinkingTimerRef.current);
          thinkingTimerRef.current = window.setTimeout(() => setThinkingBot(null), 3000);
        }
      }
    });
  }, [subscribe]);

  return {
    connected,
    state,
    myHand,
    rooms,
    systemMsg,
    thinkingBot,
    error: lastError,
    send,
    clientId,
  };
}
