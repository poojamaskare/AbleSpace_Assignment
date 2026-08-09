"use client";

import { ChevronDown, MoreHorizontal, Plus, Tag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PriorityIndicator } from "@/components/board/priority-indicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Column, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ViewPrefs } from "@/lib/view";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TaskRow({
  task,
  columnName,
  view,
  onDelete,
}: {
  task: Task;
  columnName: string;
  view: ViewPrefs;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();

  return (
    <tr className="border-t hover:bg-muted/40">
      <td className="px-4 py-2.5">
        <button
          type="button"
          onClick={() => router.push(`/tasks/${task.id}`)}
          className="text-left text-sm hover:underline"
        >
          {task.title}
        </button>
      </td>

      {view.visible.priority ? (
        <td className="px-4 py-2.5">
          <PriorityIndicator priority={task.priority} />
        </td>
      ) : null}

      {view.visible.members ? (
        <td className="px-4 py-2.5">
          <span className="flex -space-x-1.5">
            {task.assignees.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              task.assignees.map((a) => (
                <Avatar key={a.id} className="size-6 ring-2 ring-background">
                  <AvatarImage src={a.avatarUrl ?? undefined} alt={a.name} />
                  <AvatarFallback className="text-[9px]">
                    {a.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))
            )}
          </span>
        </td>
      ) : null}

      {view.visible.dueDate ? (
        <td className="px-4 py-2.5 text-sm text-muted-foreground">
          {task.dueDate ? formatDate(task.dueDate) : "—"}
        </td>
      ) : null}

      {view.visible.labels ? (
        <td className="px-4 py-2.5">
          <span className="flex flex-wrap gap-1">
            {task.labels.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              task.labels.map((l) => (
                <span
                  key={l.id}
                  className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                >
                  <Tag className="size-3" />
                  {l.name}
                </span>
              ))
            )}
          </span>
        </td>
      ) : null}

      {view.visible.status ? (
        <td className="px-4 py-2.5 text-sm text-muted-foreground">{columnName}</td>
      ) : null}

      {view.visible.reporter ? (
        <td className="px-4 py-2.5 text-sm text-muted-foreground">
          {task.assignees[0]?.name ?? "—"}
        </td>
      ) : null}

      <td className="px-4 py-2.5 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${task.title}`}
            className="rounded p-1 text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => router.push(`/tasks/${task.id}`)}>
              Open details
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              className="gap-2"
              onSelect={() => onDelete(task.id)}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

/** Grouped table view — the design groups rows by status, each group with its
 *  own header row and its own Add Task affordance. */
export function ListView({
  columns,
  view,
  onCreateTask,
  onDeleteTask,
}: {
  columns: Column[];
  view: ViewPrefs;
  onCreateTask: (columnId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [composingIn, setComposingIn] = useState<string | null>(null);

  const headers = [
    "Task",
    view.visible.priority && "Priority",
    view.visible.members && "Members",
    view.visible.dueDate && "Due Date",
    view.visible.labels && "Labels",
    view.visible.status && "Status",
    view.visible.reporter && "Reporter",
  ].filter(Boolean) as string[];

  return (
    <div className="h-full overflow-auto px-4 pb-6">
      {columns.map((column) => {
        const isCollapsed = collapsed[column.id];

        return (
          <section key={column.id} className="mb-6">
            <button
              type="button"
              onClick={() =>
                setCollapsed((c) => ({ ...c, [column.id]: !c[column.id] }))
              }
              aria-expanded={!isCollapsed}
              className="mb-2 flex items-center gap-1.5 text-sm font-medium"
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  isCollapsed && "-rotate-90",
                )}
              />
              {column.name}
              <span className="text-muted-foreground">{column.tasks.length}</span>
            </button>

            {isCollapsed ? null : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr className="bg-muted/60 text-left">
                      {headers.map((header) => (
                        <th
                          key={header}
                          className="px-4 py-2 text-xs font-medium text-muted-foreground"
                        >
                          {header}
                        </th>
                      ))}
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {column.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        columnName={column.name}
                        view={view}
                        onDelete={onDeleteTask}
                      />
                    ))}

                    <tr className="border-t">
                      <td colSpan={headers.length + 1} className="px-4 py-2">
                        {composingIn === column.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const input = (e.currentTarget.elements[0] as HTMLInputElement);
                              const title = input.value.trim();
                              if (title) onCreateTask(column.id, title);
                              setComposingIn(null);
                            }}
                          >
                            <input
                              autoFocus
                              onBlur={() => setComposingIn(null)}
                              onKeyDown={(e) =>
                                e.key === "Escape" && setComposingIn(null)
                              }
                              placeholder="Task title…"
                              aria-label="New task title"
                              className="w-full bg-transparent text-sm outline-none"
                            />
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setComposingIn(column.id)}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="size-4" />
                            Add Task
                          </button>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
