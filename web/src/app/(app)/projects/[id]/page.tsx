"use client";

import { ChevronRight, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ListView } from "@/components/board/list-view";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { filterColumns } from "@/lib/board";
import type { Board, Task } from "@/lib/types";
import { DEFAULT_VIEW, STORAGE_KEY, parseView, type ViewPrefs } from "@/lib/view";

/** Project detail: the breadcrumb plus that project's own grouped task list. */
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewPrefs>(DEFAULT_VIEW);

  const load = useCallback(
    () =>
      apiFetch<Board>(`/projects/${id}/board`)
        .then(setBoard)
        .catch((e: Error) => setError(e.message)),
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setView(parseView(localStorage.getItem(STORAGE_KEY)));
  }, []);

  const createTask = useCallback(async (columnId: string, title: string) => {
    const created = await apiFetch<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify({ title, columnId }),
    });

    setBoard((current) =>
      current
        ? {
            ...current,
            columns: current.columns.map((c) =>
              c.id === columnId ? { ...c, tasks: [...c.tasks, created] } : c,
            ),
          }
        : current,
    );
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    setBoard((current) =>
      current
        ? {
            ...current,
            columns: current.columns.map((c) => ({
              ...c,
              tasks: c.tasks.filter((t) => t.id !== taskId),
            })),
          }
        : current,
    );
    await apiFetch(`/tasks/${taskId}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const columns = useMemo(
    () => (board ? filterColumns(board.columns, "", { priorities: [], labelIds: [] }) : []),
    [board],
  );

  if (error) return <p className="p-4 text-sm text-destructive">{error}</p>;
  if (!board) return <p className="p-4 text-sm text-muted-foreground">Loading project…</p>;

  return (
    <div className="flex h-full flex-col">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 px-4 pt-3 text-sm text-muted-foreground"
      >
        <Link href="/projects" className="hover:text-foreground">
          Projects
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground">{board.name}</span>
      </nav>

      <div className="flex items-center gap-2 px-4 py-3">
        <h1 className="flex-1 text-xl font-semibold tracking-tight">Tasks</h1>
        <Button asChild variant="outline" className="h-9 gap-1.5">
          <Link href={`/tasks?project=${board.id}`}>
            <LayoutGrid className="size-4" />
            Open board
          </Link>
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <ListView
          columns={columns}
          view={view}
          onCreateTask={(columnId, title) => void createTask(columnId, title)}
          onDeleteTask={(taskId) => void deleteTask(taskId)}
        />
      </div>
    </div>
  );
}
