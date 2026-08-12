"use client";

import { useEffect, useState } from "react";

import { getSocket } from "@/lib/socket";
import type { UserSummary } from "@/lib/types";

/**
 * Who else has this project's board open right now.
 *
 * The server derives the list from the sockets in the room and pushes it on
 * every join and disconnect, so there is nothing to poll and nothing to clean
 * up when a tab closes — the socket closing *is* the signal.
 */
export function usePresence(projectId: string | null): UserSummary[] {
  const [viewers, setViewers] = useState<UserSummary[]>([]);

  useEffect(() => {
    if (!projectId) return;

    const socket = getSocket();
    socket.on("presence", setViewers);

    return () => {
      socket.off("presence", setViewers);
      // Switching boards: drop the old room's faces rather than showing them
      // against the new board until its first presence event lands.
      setViewers([]);
    };
  }, [projectId]);

  return viewers;
}
