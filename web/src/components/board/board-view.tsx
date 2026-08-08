"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";

import { BoardColumn } from "@/components/board/board-column";
import { TaskCardContent } from "@/components/board/task-card";
import type { Filters } from "@/components/board/task-filter";
import { apiFetch } from "@/lib/api";
import { moveTask } from "@/lib/board";
import type { Board, Task } from "@/lib/types";

export function BoardView({
  board,
  setBoard,
  query,
  filters,
  onCreateTask,
}: {
  board: Board;
  setBoard: (board: Board) => void;
  query: string;
  filters: Filters;
  onCreateTask: (columnId: string, title: string) => Promise<void>;
}) {
  const [dragging, setDragging] = useState<Task | null>(null);

  const sensors = useSensors(
    // A small distance threshold keeps a click on the card from being swallowed
    // as a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Search and filters compose: a task must satisfy every active criterion.
  // Filtering is per-column so the board keeps its shape while narrowing.
  const needle = query.trim().toLowerCase();
  const filtering =
    needle.length > 0 || filters.priorities.length > 0 || filters.labelIds.length > 0;

  const visible = filtering
    ? board.columns.map((column) => ({
        ...column,
        tasks: column.tasks.filter((task) => {
          if (needle && !task.title.toLowerCase().includes(needle)) return false;
          if (filters.priorities.length && !filters.priorities.includes(task.priority)) {
            return false;
          }
          if (
            filters.labelIds.length &&
            !task.labels.some((l) => filters.labelIds.includes(l.id))
          ) {
            return false;
          }
          return true;
        }),
      }))
    : board.columns;

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setDragging(
      board.columns.flatMap((c) => c.tasks).find((t) => t.id === id) ?? null,
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDragging(null);
    const { active, over } = event;
    if (!over) return;

    const result = moveTask(board.columns, String(active.id), String(over.id));
    if (!result) return;

    const previous = board;
    // Optimistic: the card lands instantly, then we reconcile with the server.
    setBoard({ ...board, columns: result.columns });

    try {
      await apiFetch(`/tasks/${active.id}/move`, {
        method: "PATCH",
        body: JSON.stringify({ columnId: result.columnId, index: result.index }),
      });
    } catch {
      setBoard(previous); // Roll back so the UI never lies about what persisted.
    }
  }

  async function handleDeleteTask(taskId: string) {
    const previous = board;
    setBoard({
      ...board,
      columns: board.columns.map((c) => ({
        ...c,
        tasks: c.tasks.filter((t) => t.id !== taskId),
      })),
    });

    try {
      await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
    } catch {
      setBoard(previous);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* The Figma comment thread confirms the board scrolls horizontally. */}
      <div className="flex h-full gap-3 overflow-x-auto px-4 pb-4">
        {visible.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            onCreateTask={(columnId, title) => void onCreateTask(columnId, title)}
            onDeleteTask={handleDeleteTask}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging ? (
          <div className="w-[284px] rotate-2">
            <TaskCardContent task={dragging} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
