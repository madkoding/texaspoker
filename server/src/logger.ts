// Structured logger with namespaces, levels, and optional timestamp.
// Enable with LOG=1 (or LOG=engine,room) in the environment.

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const envLevel = (process.env.LOG_LEVEL || (process.env.LOG ? "debug" : "info")) as Level;
const envFilter = (process.env.LOG || "").trim();

function nsEnabled(ns: string): boolean {
  if (!envFilter) return false;
  if (envFilter === "1" || envFilter.toLowerCase() === "true" || envFilter === "*") return true;
  return envFilter
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .some((token) => ns.toLowerCase().startsWith(token) || token.startsWith(ns.toLowerCase()));
}

function fmt(level: Level, ns: string, args: unknown[]) {
  const ts = new Date().toISOString().slice(11, 23);
  const tag = `[${ts} ${level.toUpperCase().padEnd(5)} ${ns}]`;
  return [tag, ...args];
}

function shouldLog(level: Level, ns: string): boolean {
  if (!nsEnabled(ns)) return false;
  return LEVEL_RANK[level] >= LEVEL_RANK[envLevel];
}

export function createLogger(ns: string) {
  return {
    debug: (...args: unknown[]) => { if (shouldLog("debug", ns)) console.log(...fmt("debug", ns, args)); },
    info: (...args: unknown[]) => { if (shouldLog("info", ns)) console.log(...fmt("info", ns, args)); },
    warn: (...args: unknown[]) => { if (shouldLog("warn", ns)) console.warn(...fmt("warn", ns, args)); },
    error: (...args: unknown[]) => { if (shouldLog("error", ns)) console.error(...fmt("error", ns, args)); },
    child: (sub: string) => createLogger(`${ns}.${sub}`),
  };
}

export type Logger = ReturnType<typeof createLogger>;

// Helpers for pretty-printing objects in logs
export function inspect(obj: unknown, max = 200): string {
  let s: string;
  try {
    s = JSON.stringify(obj, (_k, v) => (typeof v === "function" ? "[fn]" : v), 2);
  } catch {
    s = String(obj);
  }
  if (s.length > max) return s.slice(0, max) + `…(+${s.length - max} chars)`;
  return s;
}
