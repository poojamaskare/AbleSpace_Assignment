import { io, type Socket } from "socket.io-client";

import { getToken } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

/**
 * One shared connection for the whole app.
 *
 * A socket per component would mean N connections per tab and N copies of every
 * broadcast. The server also uses the socket id to skip echoing a change back
 * to whoever made it, which only works if the tab has exactly one id.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(BASE_URL, {
      auth: { token: getToken() },
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
}

/** Current socket id, sent as X-Socket-Id so the server can skip the sender. */
export function getSocketId(): string | undefined {
  return socket?.id;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
