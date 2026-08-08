"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Tag,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "29 Jul" — the compact form the design uses on card due dates. */
function formatDue(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export function TaskCardContent({
  task,
  dragging,
  onDelete,
}: {
  task: Task;
  dragging?: boolean;
  onDelete?: (taskId: string) => void;
}) {
  const router = useRouter();
  const assignee = task.assignees[0];

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 shadow-xs transition-shadow",
        dragging && "shadow-lg",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => router.push(`/tasks/${task.id}`)}
          className="min-w-0 flex-1 text-left text-sm font-medium leading-snug hover:underline"
        >
          {task.title}
        </button>

        {onDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Actions for ${task.title}`}
              className="-mr-1 shrink-0 rounded p-0.5 text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => router.push(`/tasks/${task.id}`)}
              >
                <Pencil className="size-4" />
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
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        {assignee ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <Avatar className="size-5">
              <AvatarImage src={assignee.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="text-[9px]">
                {assignee.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs text-muted-foreground">
              {assignee.name}
            </span>
          </span>
        ) : (
          <span />
        )}

        {task.dueDate ? (
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive">
            <CalendarDays className="size-3" />
            {formatDue(task.dueDate)}
          </span>
        ) : null}
      </div>

      {task.labels.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {task.labels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              <Tag className="size-3" />
              {label.name}
            </span>
          ))}
          {task.labels.length > 2 ? (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              +{task.labels.length - 2}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TaskCard({
  task,
  onDelete,
}: {
  task: Task;
  onDelete: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("group relative", isDragging && "opacity-40")}
    >
      {/* The six-dot grip from the design — per the Figma comments, the
          affordance that tells users cards are draggable. */}
      <button
        type="button"
        aria-label={`Reorder ${task.title}`}
        className="absolute -left-1 top-3 z-10 cursor-grab rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <TaskCardContent task={task} onDelete={onDelete} />
    </div>
  );
}
