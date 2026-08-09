"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AddTaskDialog } from "@/components/board/add-task-dialog";
import { BoardView } from "@/components/board/board-view";
import { ListView } from "@/components/board/list-view";
import { EMPTY_FILTERS, TaskFilter, type Filters } from "@/components/board/task-filter";
import { ViewMenu } from "@/components/board/view-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { filterColumns } from "@/lib/board";
import type { Board, Priority, Task } from "@/lib/types";
import { DEFAULT_VIEW, STORAGE_KEY, parseView, type ViewPrefs } from "@/lib/view";

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
  const [view, setView] = useState<ViewPrefs>(DEFAULT_VIEW);

  useEffect(() => {
    apiFetch<Board>("/projects/default/board")
      .then(setBoard)
      .catch((e: Error) => setError(e.message));
  }, []);

  // Restored after mount so server and client markup agree on first render.
  useEffect(() => {
    setView(parseView(localStorage.getItem(STORAGE_KEY)));
  }, []);

  const updateView = useCallback((next: ViewPrefs) => {
    setView(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  /** Single creation path for the dialog and both views' inline composers. */
  const createTask = useCallback(async (input: NewTask) => {
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
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    let previous: Board | null = null;

    setBoard((current) => {
      previous = current;
      return current
        ? {
            ...current,
            columns: current.columns.map((c) => ({
              ...c,
              tasks: c.tasks.filter((t) => t.id !== taskId),
            })),
          }
        : current;
    });

    try {
      await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
    } catch {
      if (previous) setBoard(previous);
    }
  }, []);

  const createColumn = useCallback(
    async (name: string) => {
      if (!board) return;
      const created = await apiFetch<{ id: string; name: string; position: number }>(
        `/projects/${board.id}/columns`,
        { method: "POST", body: JSON.stringify({ name }) },
      );

      setBoard((current) =>
        current
          ? { ...current, columns: [...current.columns, { ...created, tasks: [] }] }
          : current,
      );
    },
    [board],
  );

  const renameColumn = useCallback(async (columnId: string, name: string) => {
    setBoard((current) =>
      current
        ? {
            ...current,
            columns: current.columns.map((c) => (c.id === columnId ? { ...c, name } : c)),
          }
        : current,
    );

    await apiFetch(`/columns/${columnId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }).catch(() => {});
  }, []);

  const deleteColumn = useCallback(async (columnId: string) => {
    let previous: Board | null = null;
    setBoard((current) => {
      previous = current;
      return current
        ? { ...current, columns: current.columns.filter((c) => c.id !== columnId) }
        : current;
    });

    try {
      await apiFetch(`/columns/${columnId}`, { method: "DELETE" });
    } catch (e) {
      // e.g. the API refusing to remove the last column.
      if (previous) setBoard(previous);
      setError(e instanceof Error ? e.message : "Could not delete column");
    }
  }, []);

  const visibleColumns = useMemo(
    () => (board ? filterColumns(board.columns, query, filters) : []),
    [board, query, filters],
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

        <ViewMenu view={view} onChange={updateView} />

        {board ? (
          <>
            <TaskFilter projectId={board.id} filters={filters} onChange={setFilters} />
            <AddTaskDialog columns={board.columns} onCreate={createTask} />
          </>
        ) : null}
      </div>

      <div className="min-h-0 flex-1">
        {error ? (
          <p className="px-4 text-sm text-destructive">{error}</p>
        ) : !board ? (
          <p className="px-4 text-sm text-muted-foreground">Loading board…</p>
        ) : view.mode === "list" ? (
          <ListView
            columns={visibleColumns}
            view={view}
            onCreateTask={(columnId, title) => void createTask({ columnId, title })}
            onDeleteTask={(id) => void deleteTask(id)}
          />
        ) : (
          <BoardView
            board={board}
            setBoard={setBoard}
            columns={visibleColumns}
            onCreateTask={(columnId, title) => void createTask({ columnId, title })}
            onDeleteTask={(id) => void deleteTask(id)}
            onCreateColumn={(name) => void createColumn(name)}
            onRenameColumn={(id, name) => void renameColumn(id, name)}
            onDeleteColumn={(id) => void deleteColumn(id)}
          />
        )}
      </div>
    </div>
  );
}
