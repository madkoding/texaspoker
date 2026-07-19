import { Room } from "./Room";
import { ServerToClient } from "../types";

export class RoomManager {
  rooms: Map<string, Room> = new Map();

  create(): Room {
    const id = Math.random().toString(36).slice(2, 7).toUpperCase();
    const room = new Room(id);
    this.rooms.set(id, room);
    return room;
  }

  get(id: string): Room | undefined {
    return this.rooms.get(id.toUpperCase());
  }

  list() {
    return Array.from(this.rooms.values()).map((r) => r.publicInfo());
  }

  remove(id: string) {
    this.rooms.delete(id);
  }

  broadcastRooms(roomsList: { id: string; players: number; maxPlayers: number; started: boolean }[]) {
    // broadcast to clients in lobby; the client decides
  }
}
