import { useEffect, useState } from "react";
import { dumpLogs, clearLogs } from "../logger";

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    const refresh = () => setText(dumpLogs());
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-2 right-2 z-50 rounded-full bg-black/70 text-white text-xs px-3 py-1 font-mono hover:bg-black"
        title="Abrir panel de debug"
      >
        🐞
      </button>
    );
  }

  let entries: { ts: number; level: string; ns: string; msg: string }[] = [];
  try { entries = JSON.parse(text); } catch {}

  return (
    <div className="fixed bottom-0 right-0 z-50 w-[480px] h-[300px] bg-black/90 text-green-200 text-[10px] font-mono flex flex-col rounded-tl-lg shadow-2xl">
      <div className="flex items-center justify-between p-2 border-b border-white/20">
        <span className="font-bold">Debug · {entries.length} entries</span>
        <div className="flex gap-2">
          <button
            onClick={() => { clearLogs(); setText("[]"); }}
            className="px-2 py-0.5 bg-red-700 text-white rounded hover:bg-red-600"
          >
            Clear
          </button>
          <button
            onClick={() => {
              const blob = new Blob([text], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `texaspoker-log-${new Date().toISOString()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-2 py-0.5 bg-blue-700 text-white rounded hover:bg-blue-600"
          >
            Download
          </button>
          <button onClick={() => setOpen(false)} className="px-2 py-0.5 bg-white/20 text-white rounded hover:bg-white/30">×</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 leading-tight">
        {entries.length === 0 ? (
          <div className="text-white/50 text-center py-4">
            (no logs yet — enable with VITE_LOG=1 or ?log=1)
          </div>
        ) : (
          entries.map((e, i) => (
            <div
              key={i}
              className={
                e.level === "ERROR" ? "text-red-300" :
                e.level === "WARN" ? "text-yellow-300" :
                e.level === "INFO" ? "text-cyan-200" :
                "text-green-200/70"
              }
            >
              {e.msg}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
