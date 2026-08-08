"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { GripVertical, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";

import { TaskCard } from "@/components/board/task-card";
import type { Column } from "@/lib/types";
import { cn } from "@/lib/utils";

function AddTaskComposer({
  onCreate,
  onClose,
}: {
  onCreate: (title: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = title.trim();
        if (trimmed) onCreate(trimmed);
        onClose();
      }}
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        placeholder="Task title…"
        aria-label="New task title"
        className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </form>
  );
}

export function BoardColumn({
  column,
  onCreateTask,
  onDeleteTask,
}: {
  column: Column;
  onCreateTask: (columnId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const [composing, setComposing] = useState(false);

  // Droppable on the column body so an empty column still accepts a card —
  // SortableContext alone offers no drop target when it holds no items.
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  return (
    <section
      className={cn(
        "flex w-[300px] shrink-0 flex-col rounded-xl border bg-muted/40 transition-colors",
        isOver && "bg-muted",
      )}
      aria-label={column.name}
    >
      <header className="flex items-center gap-1.5 px-3 py-2.5">
        <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
        <h2 className="flex-1 truncate text-sm font-medium">{column.name}</h2>
        <span className="text-xs text-muted-foreground">{column.tasks.length}</span>
        <button
          type="button"
          aria-label={`Add task to ${column.name}`}
          onClick={() => setComposing(true)}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Options for ${column.name}`}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </header>

      <div ref={setNodeRef} className="flex min-h-2 flex-1 flex-col gap-2 px-2 pb-2">
        <SortableContext
          items={column.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDelete={onDeleteTask} />
          ))}
        </SortableContext>

        {composing ? (
          <AddTaskComposer
            onCreate={(title) => onCreateTask(column.id, title)}
            onClose={() => setComposing(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent"
          >
            <Plus className="size-4" />
            Add Task
          </button>
        )}
      </div>
    </section>
  );
}
