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
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useState } from "react";

import { BoardColumn } from "@/components/board/board-column";
import { TaskCardContent } from "@/components/board/task-card";
import { apiFetch } from "@/lib/api";
import { COLUMN_DND_PREFIX, moveColumn, moveTask } from "@/lib/board";
import type { Board, Column, Task } from "@/lib/types";

const stripPrefix = (id: string) =>
  id.startsWith(COLUMN_DND_PREFIX) ? id.slice(COLUMN_DND_PREFIX.length) : id;

const isColumnDrag = (id: string) => id.startsWith(COLUMN_DND_PREFIX);

export function BoardView({
  board,
  setBoard,
  columns,
  onCreateTask,
  onDeleteTask,
  onCreateColumn,
  onRenameColumn,
  onDeleteColumn,
}: {
  board: Board;
  setBoard: (board: Board) => void;
  /** Already filtered for display; mutations still work off the full board. */
  columns: Column[];
  onCreateTask: (columnId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateColumn: (name: string) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
}) {
  const [dragging, setDragging] = useState<Task | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);

  const sensors = useSensors(
    // A small distance threshold keeps a click on a card or grip from being
    // swallowed as a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    if (isColumnDrag(id)) return; // columns render their own move preview

    setDragging(board.columns.flatMap((c) => c.tasks).find((t) => t.id === id) ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDragging(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (isColumnDrag(activeId)) {
      await reorderColumn(stripPrefix(activeId), stripPrefix(overId));
      return;
    }

    await reorderTask(activeId, overId);
  }

  async function reorderColumn(activeId: string, overId: string) {
    const result = moveColumn(board.columns, activeId, overId);
    if (!result) return;

    const previous = board;
    setBoard({ ...board, columns: result.columns });

    try {
      await apiFetch(`/columns/${activeId}/move`, {
        method: "PATCH",
        body: JSON.stringify({ index: result.index }),
      });
    } catch {
      setBoard(previous);
    }
  }

  async function reorderTask(activeId: string, overId: string) {
    const result = moveTask(board.columns, activeId, overId);
    if (!result) return;

    const previous = board;
    // Optimistic: the card lands instantly, then we reconcile with the server.
    setBoard({ ...board, columns: result.columns });

    try {
      await apiFetch(`/tasks/${activeId}/move`, {
        method: "PATCH",
        body: JSON.stringify({ columnId: result.columnId, index: result.index }),
      });
    } catch {
      setBoard(previous); // Roll back so the UI never lies about what persisted.
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
        <SortableContext
          items={columns.map((c) => `${COLUMN_DND_PREFIX}${c.id}`)}
          strategy={horizontalListSortingStrategy}
        >
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              onCreateTask={onCreateTask}
              onDeleteTask={onDeleteTask}
              onRenameColumn={onRenameColumn}
              onDeleteColumn={onDeleteColumn}
            />
          ))}
        </SortableContext>

        <div className="w-[82vw] max-w-[300px] shrink-0 sm:w-[300px]">
          {addingColumn ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements[0] as HTMLInputElement;
                const name = input.value.trim();
                if (name) onCreateColumn(name);
                setAddingColumn(false);
              }}
            >
              <input
                autoFocus
                onBlur={() => setAddingColumn(false)}
                onKeyDown={(e) => e.key === "Escape" && setAddingColumn(false)}
                placeholder="Column name…"
                aria-label="New column name"
                className="w-full rounded-xl border bg-card px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingColumn(true)}
              className="flex w-full items-center gap-1.5 rounded-xl border border-dashed px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent"
            >
              <Plus className="size-4" />
              Add column
            </button>
          )}
        </div>
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
