import type { Server } from "socket.io";

let io: Server | null = null;

export function setIO(server: Server) {
  io = server;
}

export function tryGetIO(): Server | null {
  return io;
}
