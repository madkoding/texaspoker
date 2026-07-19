import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { ClientToServer, ServerToClient } from "../types";
import { createLogger } from "../logger";

const log = createLogger("ws");

type Listener = (msg: ServerToClient) => void;

interface SocketContextValue {
  connected: boolean;
  send: (msg: ClientToServer) => void;
  subscribe: (fn: Listener) => () => void;
  lastError: string | null;
  clientId: string;
}

const SocketContext = createContext<SocketContextValue | null>(null);

const ID_KEY = "texaspoker.id";
function getOrCreateId() {
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10).toUpperCase();
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<Listener>>(new Set());
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const intentionalCloseRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [clientId] = useState(getOrCreateId);

  useEffect(() => {
    intentionalCloseRef.current = false;
    log.info("mount", { clientId });

    const envUrl = import.meta.env.VITE_WS_URL;
    const isViteDev = location.port === "5173";
    const defaultUrl = isViteDev
      ? `ws://${location.hostname}:3001/ws`
      : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
    const url = envUrl || defaultUrl;
    log.debug("ws url", { url, isViteDev });

    const clearReconnect = () => {
      if (reconnectTimerRef.current != null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      if (intentionalCloseRef.current) return;
      log.info("connecting", { attempt: reconnectAttemptRef.current, url });
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch (e) {
        log.warn("new WebSocket threw", { error: String(e) });
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        if (intentionalCloseRef.current) {
          try { ws.close(); } catch {}
          return;
        }
        log.info("connected");
        setConnected(true);
        reconnectAttemptRef.current = 0;
        setLastError(null);
      };
      ws.onclose = () => {
        log.info("closed", { intentional: intentionalCloseRef.current });
        if (wsRef.current === ws) wsRef.current = null;
        setConnected(false);
        if (intentionalCloseRef.current) return;
        scheduleReconnect();
      };
      ws.onerror = () => {
        log.warn("error event");
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as ServerToClient;
          log.debug("recv", { type: msg.type, roomId: msg.type === "state" ? msg.state?.roomId : undefined });
          if (msg.type === "error" && msg.error) setLastError(msg.error);
          listenersRef.current.forEach((l) => l(msg));
        } catch (err) {
          log.warn("invalid json from server", { err: String(err) });
        }
      };
    };

    const scheduleReconnect = () => {
      if (intentionalCloseRef.current) return;
      if (reconnectTimerRef.current != null) return;
      const attempt = reconnectAttemptRef.current++;
      const delay = Math.min(8000, 1000 * Math.pow(1.6, attempt));
      log.info("scheduling reconnect", { attempt, delayMs: delay });
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };

    connect();

    return () => {
      log.info("unmount");
      intentionalCloseRef.current = true;
      clearReconnect();
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CLOSING) {
          try { ws.close(); } catch {}
        }
      }
    };
  }, []);

  const send = useCallback((msg: ClientToServer) => {
    const ws = wsRef.current;
    const payload = JSON.stringify({ ...msg, clientId: clientId });
    if (ws && ws.readyState === WebSocket.OPEN) {
      log.debug("send", { type: msg.type, action: (msg as any).action, amount: (msg as any).amount });
      ws.send(payload);
    } else if (ws && ws.readyState === WebSocket.CONNECTING) {
      log.debug("send queued (connecting)", { type: msg.type });
      ws.addEventListener(
        "open",
        () => {
          try { ws.send(payload); } catch {}
        },
        { once: true }
      );
    } else {
      log.warn("send dropped: socket not open", { type: msg.type, readyState: ws?.readyState });
      setLastError(`No se pudo enviar: ${msg.type} (socket cerrado)`);
    }
  }, [clientId]);

  const subscribe = useCallback((fn: Listener) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ connected, send, subscribe, lastError, clientId }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocketContext must be used inside SocketProvider");
  return ctx;
}
