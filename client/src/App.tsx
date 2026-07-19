import { useEffect, useState, ReactNode } from "react";
import { NamePrompt } from "./pages/NamePrompt";
import { Lobby } from "./pages/Lobby";
import { GameRoom } from "./pages/GameRoom";
import { HandGuide } from "./pages/HandGuide";
import { useSocketContext } from "./hooks/SocketProvider";
import { DebugPanel } from "./components/DebugPanel";
import { createLogger } from "./logger";

const log = createLogger("app");

type View = "name" | "lobby" | "room" | "guide";

const NAME_KEY = "texaspoker.name";

export default function App() {
  const [view, setView] = useState<View>(() => (localStorage.getItem(NAME_KEY) ? "lobby" : "name"));
  const [name, setName] = useState(localStorage.getItem(NAME_KEY) ?? "");
  const { clientId: myId } = useSocketContext();
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (name) localStorage.setItem(NAME_KEY, name);
  }, [name]);

  useEffect(() => {
    log.debug("view", { view, name, roomId });
  }, [view, name, roomId]);

  let content: ReactNode = null;
  if (view === "guide") {
    const realRoom = roomId && roomId !== "__new__" ? roomId : null;
    content = <HandGuide onBack={() => setView(realRoom ? "room" : "lobby")} />;
  } else if (view === "name" || !name) {
    content = (
      <NamePrompt
        initial={name}
        onSubmit={(n) => {
          setName(n);
          setView("lobby");
        }}
      />
    );
  } else if (view === "room" && roomId) {
    content = (
      <GameRoom
        playerName={name}
        myId={myId}
        roomId={roomId}
        onLeave={() => {
          setRoomId(null);
          setView("lobby");
        }}
        onGuide={() => setView("guide")}
      />
    );
  } else {
    content = (
      <Lobby
        playerName={name}
        myId={myId}
        onJoin={(id) => {
          setRoomId(id);
          setView("room");
        }}
        onCreate={(id) => {
          setRoomId(id);
          setView("room");
        }}
        onGuide={() => setView("guide")}
      />
    );
  }

  return (
    <>
      {content}
      <DebugPanel />
    </>
  );
}
