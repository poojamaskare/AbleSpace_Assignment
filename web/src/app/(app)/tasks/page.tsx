"use client";

import { Columns3, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AddTaskDialog } from "@/components/board/add-task-dialog";
import { BoardView } from "@/components/board/board-view";
import { EMPTY_FILTERS, TaskFilter, type Filters } from "@/components/board/task-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { Board, Priority, Task } from "@/lib/types";

type NewTask = {
  title: string;
  description?: string;
  columnId: string;
  priority?: Priority;
  dueDate?: string | null;
};

export default function TasksPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  useEffect(() => {
    apiFetch<Board>("/projects/default/board")
      .then(setBoard)
      .catch((e: Error) => setError(e.message));
  }, []);

  // Single creation path for both the header dialog and each column's inline
  // composer, so they can never drift apart.
  const createTask = useCallback(
    async (input: NewTask) => {
      const created = await apiFetch<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify(input),
      });

      setBoard((current) =>
        current
          ? {
              ...current,
              columns: current.columns.map((c) =>
                c.id === input.columnId ? { ...c, tasks: [...c.tasks, created] } : c,
              ),
            }
          : current,
      );
    },
    [],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <h1 className="flex-1 text-xl font-semibold tracking-tight">Tasks</h1>

        {searching ? (
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => !query && setSearching(false)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            className="h-9 w-56"
          />
        ) : (
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="Search tasks"
            onClick={() => setSearching(true)}
          >
            <Search className="size-4" />
          </Button>
        )}

        <Button variant="outline" className="h-9 gap-1.5" disabled>
          <Columns3 className="size-4" />
          Fields
        </Button>

        {board ? (
          <>
            <TaskFilter
              projectId={board.id}
              filters={filters}
              onChange={setFilters}
            />
            <AddTaskDialog
              columns={board.columns}
              onCreate={(input) => createTask(input)}
            />
          </>
        ) : null}
      </div>

      <div className="min-h-0 flex-1">
        {error ? (
          <p className="px-4 text-sm text-destructive">{error}</p>
        ) : board ? (
          <BoardView
            board={board}
            setBoard={setBoard}
            query={query}
            filters={filters}
            onCreateTask={(columnId, title) => createTask({ columnId, title })}
          />
        ) : (
          <p className="px-4 text-sm text-muted-foreground">Loading board…</p>
        )}
      </div>
    </div>
  );
}
