"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useSession } from "@/components/auth/session-provider";
import { CommentThread } from "@/components/task/comment-thread";
import { DueDatePicker } from "@/components/task/due-date-picker";
import { SubtaskList } from "@/components/task/subtask-list";
import { LabelPicker } from "@/components/task/label-picker";
import { PrioritySelect } from "@/components/task/priority-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiFetch } from "@/lib/api";
import type { Priority, Task, TaskDetail } from "@/lib/types";

/** Placeholder row shown while the server assigns the real id. Inherits the
 *  parent's column and project, which is what the API does server-side. */
function pendingSubtask(parent: TaskDetail, title: string): Task {
  return {
    id: `pending-${Date.now()}`,
    title,
    description: null,
    priority: "NONE",
    startDate: null,
    dueDate: null,
    position: 0,
    columnId: parent.columnId,
    projectId: parent.projectId,
    assignees: [],
    labels: [],
    _count: { subtasks: 0, comments: 0 },
  };
}

export default function TaskDetailPage() {
  const me = useSession();
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    () =>
      apiFetch<TaskDetail>(`/tasks/${id}`)
        .then(setTask)
        .catch((e: Error) => setError(e.message)),
    [id],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * Apply the change locally first, then send it. The database is a ~250ms
   * round trip away and these endpoints run several queries, so awaiting the
   * response before rendering made every comment feel like a page load.
   * `optimistic` updates state immediately; the refetch afterwards reconciles
   * server-owned fields (ids, timestamps, the activity feed) without blocking.
   */
  const mutate = useCallback(
    async (path: string, init: RequestInit, optimistic?: (t: TaskDetail) => TaskDetail) => {
      let previous: TaskDetail | null = null;
      if (optimistic) {
        setTask((current) => {
          previous = current;
          return current ? optimistic(current) : current;
        });
      }

      try {
        await apiFetch(path, init);
        await reload();
      } catch (e) {
        if (previous) setTask(previous);
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    },
    [reload],
  );

  /** Optimistic patch: apply locally, then persist; roll back on failure. */
  const patch = useCallback(
    async (changes: Partial<TaskDetail>, body: Record<string, unknown>) => {
      if (!task) return;
      const previous = task;
      setTask({ ...task, ...changes });

      try {
        await apiFetch(`/tasks/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } catch (e) {
        setTask(previous);
        setError(e instanceof Error ? e.message : "Update failed");
      }
    },
    [id, task],
  );

  if (error && !task) {
    return <p className="p-4 text-sm text-destructive">{error}</p>;
  }
  if (!task) {
    return <p className="p-4 text-sm text-muted-foreground">Loading task…</p>;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/tasks"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to board
      </Link>

      <div className="space-y-2">
        <input
          value={task.title}
          onChange={(e) => setTask({ ...task, title: e.target.value })}
          onBlur={(e) => void patch({}, { title: e.target.value.trim() })}
          aria-label="Task title"
          className="w-full bg-transparent text-xl font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-2xl"
        />
        <textarea
          value={task.description ?? ""}
          onChange={(e) => setTask({ ...task, description: e.target.value })}
          onBlur={(e) => void patch({}, { description: e.target.value })}
          placeholder="Add a description…"
          aria-label="Task description"
          rows={2}
          className="w-full resize-none bg-transparent text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <dl className="grid gap-3 text-sm">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-[110px_1fr] sm:items-center sm:gap-2">
          <dt className="text-muted-foreground">Priority</dt>
          <dd>
            <PrioritySelect
              value={task.priority}
              onChange={(priority: Priority) =>
                void patch({ priority }, { priority })
              }
            />
          </dd>
        </div>

        <div className="grid grid-cols-1 gap-1 sm:grid-cols-[110px_1fr] sm:items-center sm:gap-2">
          <dt className="text-muted-foreground">Due date</dt>
          <dd>
            <DueDatePicker
              value={task.dueDate}
              onChange={(dueDate) => void patch({ dueDate }, { dueDate })}
            />
          </dd>
        </div>

        <div className="grid grid-cols-1 gap-1 sm:grid-cols-[110px_1fr] sm:items-start sm:gap-2">
          <dt className="text-muted-foreground sm:pt-1">Labels</dt>
          <dd>
            <LabelPicker
              projectId={task.projectId}
              selected={task.labels}
              onChange={(labelIds) =>
                void patch(
                  {
                    // Optimistic view of the new chip set; the PATCH response
                    // is authoritative on the next load.
                    labels: labelIds.map(
                      (lid) =>
                        task.labels.find((l) => l.id === lid) ?? {
                          id: lid,
                          name: "…",
                        },
                    ),
                  },
                  { labelIds },
                )
              }
            />
          </dd>
        </div>

        <div className="grid grid-cols-1 gap-1 sm:grid-cols-[110px_1fr] sm:items-center sm:gap-2">
          <dt className="text-muted-foreground">Assignees</dt>
          <dd className="flex items-center gap-1.5">
            {task.assignees.map((a) => (
              <span key={a.id} className="flex items-center gap-1.5">
                <Avatar className="size-5">
                  <AvatarImage src={a.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback className="text-[9px]">
                    {a.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{a.name}</span>
              </span>
            ))}
          </dd>
        </div>
      </dl>

      <SubtaskList
        subtasks={task.subtasks}
        onCreate={(title) =>
          void mutate(
            "/tasks",
            { method: "POST", body: JSON.stringify({ title, parentId: task.id }) },
            (t) => ({ ...t, subtasks: [...t.subtasks, pendingSubtask(t, title)] }),
          )
        }
        onDelete={(subId) =>
          void mutate(`/tasks/${subId}`, { method: "DELETE" }, (t) => ({
            ...t,
            subtasks: t.subtasks.filter((s) => s.id !== subId),
          }))
        }
      />

      <CommentThread
        comments={task.comments}
        onCreate={(body, parentId) =>
          void mutate(
            `/tasks/${task.id}/comments`,
            { method: "POST", body: JSON.stringify({ body, parentId }) },
            (t) => ({
              ...t,
              comments: [
                ...t.comments,
                {
                  id: `pending-${Date.now()}`,
                  body,
                  createdAt: new Date().toISOString(),
                  parentId: parentId ?? null,
                  author: { id: me.id, name: me.name, avatarUrl: me.avatarUrl },
                },
              ],
            }),
          )
        }
        onDelete={(commentId) =>
          void mutate(`/comments/${commentId}`, { method: "DELETE" }, (t) => ({
            ...t,
            comments: t.comments.filter((c) => c.id !== commentId),
          }))
        }
      />

      {task.activities.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Updates</h2>
          <ul className="space-y-1.5">
            {task.activities.map((activity) => (
              <li key={activity.id} className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {activity.actor?.name ?? "Someone"}
                </span>{" "}
                {activity.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
