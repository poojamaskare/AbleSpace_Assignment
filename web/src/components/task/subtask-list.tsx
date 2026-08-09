"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { PriorityIndicator } from "@/components/board/priority-indicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/types";

export function SubtaskList({
  subtasks,
  onCreate,
  onDelete,
}: {
  subtasks: Task[];
  onCreate: (title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [composing, setComposing] = useState(false);

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">Subtasks</h2>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="bg-muted/60 text-left">
              {["Task", "Priority", "Members", "Due Date"].map((h) => (
                <th key={h} className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {subtasks.map((sub) => (
              <tr key={sub.id} className="border-t">
                <td className="px-3 py-2 text-sm">{sub.title}</td>
                <td className="px-3 py-2">
                  <PriorityIndicator priority={sub.priority} />
                </td>
                <td className="px-3 py-2">
                  <span className="flex -space-x-1.5">
                    {sub.assignees.map((a) => (
                      <Avatar key={a.id} className="size-5 ring-2 ring-background">
                        <AvatarImage src={a.avatarUrl ?? undefined} alt={a.name} />
                        <AvatarFallback className="text-[9px]">
                          {a.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm text-muted-foreground">
                  {sub.dueDate
                    ? new Date(sub.dueDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Delete ${sub.title}`}
                    onClick={() => onDelete(sub.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))}

            <tr className="border-t">
              <td colSpan={5} className="px-3 py-2">
                {composing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.elements[0] as HTMLInputElement;
                      const title = input.value.trim();
                      if (title) onCreate(title);
                      setComposing(false);
                    }}
                  >
                    <input
                      autoFocus
                      onBlur={() => setComposing(false)}
                      onKeyDown={(e) => e.key === "Escape" && setComposing(false)}
                      placeholder="Subtask title…"
                      aria-label="New subtask title"
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setComposing(true)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="size-4" />
                    Add Subtasks
                  </button>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
