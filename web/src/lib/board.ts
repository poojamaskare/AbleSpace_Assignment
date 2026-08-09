import type { Column, Task } from "./types";

export type MoveResult = {
  columns: Column[];
  /** Where the task ended up — sent to PATCH /tasks/:id/move. */
  columnId: string;
  index: number;
};

/**
 * Narrow every column's tasks by search text, priorities and labels. Criteria
 * compose — a task must satisfy all active ones. Column structure is preserved
 * so an emptied column still renders (and still accepts drops).
 *
 * Shared by the board and list views so the two can never disagree about what
 * a filter means.
 */
export function filterColumns(
  columns: Column[],
  query: string,
  filters: { priorities: string[]; labelIds: string[] },
): Column[] {
  const needle = query.trim().toLowerCase();
  const active =
    needle.length > 0 || filters.priorities.length > 0 || filters.labelIds.length > 0;

  if (!active) return columns;

  return columns.map((column) => ({
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
  }));
}

/**
 * Reorder whole columns. Ids are prefixed (`col:<id>`) in the DnD layer so a
 * column drag can never be mistaken for a card drag — both live in the same
 * DndContext and would otherwise share an id namespace.
 */
export const COLUMN_DND_PREFIX = "col:";

export function moveColumn(
  columns: Column[],
  activeId: string,
  overId: string,
): { columns: Column[]; index: number } | null {
  const from = columns.findIndex((c) => c.id === activeId);
  const to = columns.findIndex((c) => c.id === overId);

  if (from === -1 || to === -1 || from === to) return null;

  const next = [...columns];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);

  return { columns: next, index: to };
}

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
