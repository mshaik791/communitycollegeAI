import type http from "http";
import { Server } from "socket.io";

import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./types";

let io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null =
  null;

export function initIo(server: http.Server) {
  io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    server,
    {
      cors: {
        origin: "http://localhost:3000",
        credentials: true,
      },
    },
  );
  return io;
}

export function getIo() {
  if (!io) {
    throw new Error("Socket.IO server not initialized");
  }
  return io;
}

