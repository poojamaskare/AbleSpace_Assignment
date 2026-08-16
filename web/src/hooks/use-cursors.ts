"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSocket } from "@/lib/socket";
import type { UserSummary } from "@/lib/types";

export type Cursor = { socketId: string; user: UserSummary; x: number; y: number };

/**
 * Everyone else's pointer on this board, and a sender for our own.
 *
 * The server never echoes our cursor back, so everything here is somebody
 * else's. Positions are board-content coordinates rather than viewport ones —
 * the other tab may be scrolled somewhere else entirely and must still see the
 * pointer over the same card.
 */
export function useCursors(projectId: string | null) {
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const pending = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef(0);

  useEffect(() => {
    if (!projectId) return;

    const socket = getSocket();
    const move = (c: Cursor) => setCursors((all) => ({ ...all, [c.socketId]: c }));
    const gone = (socketId: string) =>
      setCursors(({ [socketId]: _removed, ...rest }) => rest);

    socket.on("cursor", move);
    socket.on("cursor:gone", gone);

    return () => {
      socket.off("cursor", move);
      socket.off("cursor:gone", gone);
      // Switching boards: drop the old room's pointers rather than leaving
      // them floating over a board they were never on.
      setCursors({});
    };
  }, [projectId]);

  // pointermove fires far faster than a screen can show it; one packet per
  // frame is the most anyone can perceive and keeps the socket quiet.
  const send = useCallback((x: number, y: number) => {
    pending.current = { x, y };
    if (frame.current) return;

    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (pending.current) getSocket().emit("cursor", pending.current);
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return { cursors: Object.values(cursors), send };
}
