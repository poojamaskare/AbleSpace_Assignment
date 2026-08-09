"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { TaskCard } from "@/components/board/task-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { COLUMN_DND_PREFIX } from "@/lib/board";
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
  onRenameColumn,
  onDeleteColumn,
}: {
  column: Column;
  onCreateTask: (columnId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
}) {
  const [composing, setComposing] = useState(false);
  const [renaming, setRenaming] = useState(false);

  // The column is sortable under a prefixed id so a column drag is never
  // confused with a card drag — both share one DndContext.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `${COLUMN_DND_PREFIX}${column.id}` });

  // Separate droppable on the body, keyed by the raw column id, so an empty
  // column still accepts a card.
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.id });

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        // On phones a column takes most of the viewport so the next one peeks
        // in — the cue that the board scrolls sideways. Fixed width from sm up.
        "flex w-[82vw] max-w-[300px] shrink-0 flex-col rounded-xl border bg-muted/40 transition-colors sm:w-[300px]",
        isOver && "bg-muted",
        isDragging && "opacity-50",
      )}
      aria-label={column.name}
    >
      <header className="flex items-center gap-1.5 px-3 py-2.5">
        <button
          type="button"
          aria-label={`Reorder ${column.name}`}
          className="shrink-0 cursor-grab rounded text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        {renaming ? (
          <form
            className="flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements[0] as HTMLInputElement;
              const name = input.value.trim();
              if (name && name !== column.name) onRenameColumn(column.id, name);
              setRenaming(false);
            }}
          >
            <input
              autoFocus
              defaultValue={column.name}
              onBlur={() => setRenaming(false)}
              onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
              aria-label="Column name"
              className="w-full rounded border bg-card px-1.5 py-0.5 text-sm outline-none"
            />
          </form>
        ) : (
          <h2 className="flex-1 truncate text-sm font-medium">{column.name}</h2>
        )}

        <span className="text-xs text-muted-foreground">{column.tasks.length}</span>

        <button
          type="button"
          aria-label={`Add task to ${column.name}`}
          onClick={() => setComposing(true)}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent"
        >
          <Plus className="size-4" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Options for ${column.name}`}
            className="rounded p-0.5 text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => setRenaming(true)}>Rename</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setComposing(true)}>
              Add task
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              className="gap-2"
              onSelect={() => onDeleteColumn(column.id)}
            >
              <Trash2 className="size-4" />
              Delete column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div ref={setDropRef} className="flex min-h-2 flex-1 flex-col gap-2 px-2 pb-2">
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
