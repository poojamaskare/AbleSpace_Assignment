"use client";

import { useEffect } from "react";

import { getSocket } from "@/lib/socket";
import type { Board, Column, Task } from "@/lib/types";

type Setter = (update: (current: Board | null) => Board | null) => void;

const byPosition = <T extends { position: number }>(items: T[]) =>
  [...items].sort((a, b) => a.position - b.position);

/** Drop the task wherever it currently lives, so a move can re-insert it. */
const withoutTask = (columns: Column[], taskId: string) =>
  columns.map((column) => ({
    ...column,
    tasks: column.tasks.filter((t) => t.id !== taskId),
  }));

/**
 * Applies changes other tabs make to this project's board, live.
 *
 * The server never echoes a change back to the tab that caused it (see the
 * X-Socket-Id header), so everything arriving here came from somewhere else and
 * can be applied without fighting local optimistic state.
 *
 * Every handler is written to be idempotent — a reconnect can replay an event
 * we already have, and applying it twice must not duplicate a card.
 */
export function useRealtimeBoard(projectId: string | null, setBoard: Setter) {
  useEffect(() => {
    if (!projectId) return;

    const socket = getSocket();
    const join = () => socket.emit("project:join", projectId);

    join();
    socket.on("connect", join);

    const upsertTask = (task: Task) =>
      setBoard((current) => {
        if (!current) return current;

        const columns = withoutTask(current.columns, task.id).map((column) =>
          column.id === task.columnId
            ? { ...column, tasks: byPosition([...column.tasks, task]) }
            : column,
        );

        return { ...current, columns };
      });

    const removeTask = ({ id }: { id: string }) =>
      setBoard((current) =>
        current ? { ...current, columns: withoutTask(current.columns, id) } : current,
      );

    const upsertColumn = (column: { id: string; name: string; position: number }) =>
      setBoard((current) => {
        if (!current) return current;

        const existing = current.columns.find((c) => c.id === column.id);
        const columns = existing
          ? current.columns.map((c) => (c.id === column.id ? { ...c, ...column } : c))
          : [...current.columns, { ...column, tasks: [] }];

        return { ...current, columns: byPosition(columns) };
      });

    const removeColumn = ({ id }: { id: string }) =>
      setBoard((current) =>
        current
          ? { ...current, columns: current.columns.filter((c) => c.id !== id) }
          : current,
      );

    socket.on("task.created", upsertTask);
    socket.on("task.updated", upsertTask);
    socket.on("task.moved", upsertTask);
    socket.on("task.deleted", removeTask);
    socket.on("column.created", upsertColumn);
    socket.on("column.updated", upsertColumn);
    socket.on("column.moved", upsertColumn);
    socket.on("column.deleted", removeColumn);

    return () => {
      socket.off("connect", join);
      socket.off("task.created", upsertTask);
      socket.off("task.updated", upsertTask);
      socket.off("task.moved", upsertTask);
      socket.off("task.deleted", removeTask);
      socket.off("column.created", upsertColumn);
      socket.off("column.updated", upsertColumn);
      socket.off("column.moved", upsertColumn);
      socket.off("column.deleted", removeColumn);
    };
  }, [projectId, setBoard]);
}
