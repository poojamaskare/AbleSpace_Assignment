"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { Board } from "@/lib/types";

export default function TasksPage() {
  const [board, setBoard] = useState<Board | null>(null);

  useEffect(() => {
    apiFetch<Board>("/projects/default/board").then(setBoard).catch(() => {});
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
      {board ? (
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {board.columns.map((column) => (
            <li key={column.id}>
              {column.name} — {column.tasks.length} tasks
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Loading board…</p>
      )}
    </div>
  );
}
