import type { Column, Task } from "./types";

export type MoveResult = {
  columns: Column[];
  /** Where the task ended up — sent to PATCH /tasks/:id/move. */
  columnId: string;
  index: number;
};

function locate(columns: Column[], taskId: string) {
  for (let c = 0; c < columns.length; c++) {
    const t = columns[c].tasks.findIndex((task) => task.id === taskId);
    if (t !== -1) return { columnIndex: c, taskIndex: t };
  }
  return null;
}

/**
 * Compute the board after dragging `activeId` onto `overId`.
 *
 * `overId` is either another task (drop between cards) or a column (drop into
 * empty space). Returns null when the drag is a no-op, so callers can skip both
 * the re-render and the network call.
 */
export function moveTask(
  columns: Column[],
  activeId: string,
  overId: string,
): MoveResult | null {
  const from = locate(columns, activeId);
  if (!from) return null;

  const overTask = locate(columns, overId);
  const targetColumnIndex = overTask
    ? overTask.columnIndex
    : columns.findIndex((c) => c.id === overId);

  if (targetColumnIndex === -1) return null;

  // Dropping a card onto itself changes nothing.
  if (
    overTask &&
    from.columnIndex === overTask.columnIndex &&
    from.taskIndex === overTask.taskIndex
  ) {
    return null;
  }

  // The insert index comes from the ORIGINAL array, before the task is pulled
  // out. Reading it after removal shifts every position below the source up by
  // one, which silently drops a downward move one slot short of its target.
  const index = overTask
    ? overTask.taskIndex
    : columns[targetColumnIndex].tasks.length;

  const next = columns.map((column) => ({ ...column, tasks: [...column.tasks] }));
  const [moved] = next[from.columnIndex].tasks.splice(from.taskIndex, 1);
  const destination = next[targetColumnIndex];
  destination.tasks.splice(index, 0, { ...moved, columnId: destination.id } as Task);

  return { columns: next, columnId: destination.id, index };
}
