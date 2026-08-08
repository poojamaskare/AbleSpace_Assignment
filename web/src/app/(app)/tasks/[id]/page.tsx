"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { DueDatePicker } from "@/components/task/due-date-picker";
import { LabelPicker } from "@/components/task/label-picker";
import { PrioritySelect } from "@/components/task/priority-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiFetch } from "@/lib/api";
import type { Priority, TaskDetail } from "@/lib/types";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<TaskDetail>(`/tasks/${id}`)
      .then(setTask)
      .catch((e: Error) => setError(e.message));
  }, [id]);

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
          className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        <div className="grid grid-cols-[110px_1fr] items-center gap-2">
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

        <div className="grid grid-cols-[110px_1fr] items-center gap-2">
          <dt className="text-muted-foreground">Due date</dt>
          <dd>
            <DueDatePicker
              value={task.dueDate}
              onChange={(dueDate) => void patch({ dueDate }, { dueDate })}
            />
          </dd>
        </div>

        <div className="grid grid-cols-[110px_1fr] items-start gap-2">
          <dt className="pt-1 text-muted-foreground">Labels</dt>
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

        <div className="grid grid-cols-[110px_1fr] items-center gap-2">
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

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
