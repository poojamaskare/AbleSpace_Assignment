"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { AddTaskDialog } from "@/components/board/add-task-dialog";
import { BoardView } from "@/components/board/board-view";
import { ListView } from "@/components/board/list-view";
import { ProjectSwitcher, type ProjectOption } from "@/components/board/project-switcher";
import { EMPTY_FILTERS, TaskFilter, type Filters } from "@/components/board/task-filter";
import { ViewMenu } from "@/components/board/view-menu";
import { useSession } from "@/components/auth/session-provider";
import { AvatarStack } from "@/components/project/avatar-stack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePresence } from "@/hooks/use-presence";
import { useRealtimeBoard } from "@/hooks/use-realtime-board";
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

/** Remembers the last project opened, so returning to /tasks lands where you
 *  left off instead of always on the first project. */
const ACTIVE_PROJECT_KEY = "pyramid-active-project";

// useSearchParams needs a Suspense boundary for this route to stay static.
export default function TasksPage() {
  return (
    <Suspense
      fallback={<p className="p-4 text-sm text-muted-foreground">Loading board…</p>}
    >
      <TasksBoard />
    </Suspense>
  );
}

function TasksBoard() {
  const session = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [view, setView] = useState<ViewPrefs>(DEFAULT_VIEW);

  // Which project the board shows. `?project=` wins so a board is linkable;
  // otherwise the last one used, falling back to the user's default.
  const projectParam = searchParams.get("project");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(projectParam);
  const viewers = usePresence(activeProjectId);

  // Matches the server's write gate: a guest edits only what they lead.
  const readOnly = session.isGuest && board !== null && board.leadId !== session.id;

  useEffect(() => {
    apiFetch<ProjectOption[]>("/projects")
      .then((list) => {
        setProjects(list);
        setActiveProjectId((current) => {
          if (current && list.some((p) => p.id === current)) return current;
          const remembered = localStorage.getItem(ACTIVE_PROJECT_KEY);
          if (remembered && list.some((p) => p.id === remembered)) return remembered;
          return list[0]?.id ?? null;
        });
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!activeProjectId) return;
    localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);

    // Switching boards leaves the previous fetch in flight, and whichever
    // response lands last wins — so a slow one paints the old project's cards
    // under the new project's name. Ignore anything that arrives after we've
    // moved on.
    let live = true;

    setBoard(null);
    apiFetch<Board>(`/projects/${activeProjectId}/board`)
      .then((next) => live && setBoard(next))
      .catch((e: Error) => live && setError(e.message));

    return () => {
      live = false;
    };
  }, [activeProjectId]);

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

  // Live updates from everyone in this project — other members' tabs included.
  useRealtimeBoard(activeProjectId, setBoard);

  /** The inline composers have no error UI of their own, and `void promise`
   *  turns a rejection into an unhandled one — a red overlay for what is
   *  usually just the API restarting. Route it to the page banner instead. */
  const report = useCallback(
    (work: Promise<unknown>) =>
      void work.catch((e: Error) => setError(e.message)),
    [],
  );

  const visibleColumns = useMemo(
    () => (board ? filterColumns(board.columns, query, filters) : []),
    [board, query, filters],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <div className="flex-1">
          <ProjectSwitcher
            projects={projects}
            activeId={activeProjectId}
            onSelect={(projectId) => {
              setActiveProjectId(projectId);
              router.replace(`/tasks?project=${projectId}`);
            }}
          />
        </div>

        {/* A guest on someone else's board can watch but not edit; saying so
            here beats letting every action fail with a 403. */}
        {readOnly ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            View only
          </span>
        ) : null}

        {/* Who else is on this board right now. Hidden when you are alone —
            a stack of one is just your own face staring back. */}
        {viewers.length > 1 ? (
          <AvatarStack
            users={viewers}
            className="mr-1"
            title={`${viewers.length} people on this board`}
          />
        ) : null}

        {searching ? (
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => !query && setSearching(false)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            // Full width on phones so the field is usable, fixed once there
            // is room for the rest of the toolbar beside it.
            className="h-9 w-full sm:w-56"
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
            onCreateTask={(columnId, title) => report(createTask({ columnId, title }))}
            onDeleteTask={(id) => void deleteTask(id)}
          />
        ) : (
          <BoardView
            board={board}
            setBoard={setBoard}
            columns={visibleColumns}
            onCreateTask={(columnId, title) => report(createTask({ columnId, title }))}
            onDeleteTask={(id) => void deleteTask(id)}
            onCreateColumn={(name) => report(createColumn(name))}
            onRenameColumn={(id, name) => void renameColumn(id, name)}
            onDeleteColumn={(id) => void deleteColumn(id)}
          />
        )}
      </div>
    </div>
  );
}
