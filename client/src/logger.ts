// Client-side logger with levels, namespaces, and sessionStorage buffer.
// Enable with VITE_LOG=1 (or VITE_LOG=ws,app) in .env, or `?log=1` in URL.
// All logs are also stored in sessionStorage under "texaspoker.log" so you
// can inspect them via DevTools > Application > Session Storage.

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function getEnv() {
  const env = (import.meta as any).env?.VITE_LOG as string | undefined;
  if (env) return env;
  if (typeof window !== "undefined" && window.location.search.includes("log=")) {
    return new URLSearchParams(window.location.search).get("log") || "";
  }
  return "";
}

const envFilter = getEnv().trim();
const envLevel = ((import.meta as any).env?.VITE_LOG_LEVEL as Level) || "debug";

const STORAGE_KEY = "texaspoker.log";
const MAX_ENTRIES = 500;

function nsEnabled(ns: string): boolean {
  if (!envFilter) return false;
  if (envFilter === "1" || envFilter === "*" || envFilter.toLowerCase() === "true") return true;
  return envFilter
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .some((token) => ns.toLowerCase().startsWith(token) || token.startsWith(ns.toLowerCase()));
}

function shouldLog(level: Level, ns: string): boolean {
  if (!nsEnabled(ns)) return false;
  return LEVEL_RANK[level] >= LEVEL_RANK[envLevel];
}

function fmt(level: Level, ns: string, args: unknown[]) {
  const ts = new Date().toISOString().slice(11, 23);
  const tag = `[${ts} ${level.toUpperCase().padEnd(5)} ${ns}]`;
  return [tag, ...args];
}

function store(level: Level, ns: string, args: unknown[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const arr: { ts: number; level: Level; ns: string; msg: string }[] = raw ? JSON.parse(raw) : [];
    const ts = Date.now();
    const tag = `[${new Date(ts).toISOString().slice(11, 23)} ${level.toUpperCase().padEnd(5)} ${ns}]`;
    const msg = args
      .map((a) => {
        if (typeof a === "string") return a;
        try { return JSON.stringify(a); } catch { return String(a); }
      })
      .join(" ");
    arr.push({ ts, level, ns, msg: tag + " " + msg });
    if (arr.length > MAX_ENTRIES) arr.splice(0, arr.length - MAX_ENTRIES);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {}
}

export function createLogger(ns: string) {
  return {
    debug: (...args: unknown[]) => {
      if (shouldLog("debug", ns)) {
        console.log(...fmt("debug", ns, args));
        store("debug", ns, args);
      }
    },
    info: (...args: unknown[]) => {
      if (shouldLog("info", ns)) {
        console.log(...fmt("info", ns, args));
        store("info", ns, args);
      }
    },
    warn: (...args: unknown[]) => {
      if (shouldLog("warn", ns)) {
        console.warn(...fmt("warn", ns, args));
        store("warn", ns, args);
      }
    },
    error: (...args: unknown[]) => {
      if (shouldLog("error", ns)) {
        console.error(...fmt("error", ns, args));
        store("error", ns, args);
      }
    },
    child: (sub: string) => createLogger(`${ns}.${sub}`),
  };
}

export function dumpLogs(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || "[]";
  } catch {
    return "[]";
  }
}

export function clearLogs() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

export type Logger = ReturnType<typeof createLogger>;
