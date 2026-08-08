/** Gap between adjacent positions when appending or seeding a column. */
export const POSITION_STEP = 1000;

/**
 * Position for a task landing at `index` among `siblings` (ascending, excluding
 * the task being moved).
 *
 * Sparse ordering: we pick the midpoint between the neighbours rather than
 * renumbering the column, so a drag writes exactly one row.
 *
 * Repeated inserts into the same gap halve it each time, so positions can in
 * principle converge past float precision after ~50 splits in one spot. That
 * needs a rebalance pass; at the scale of a task board it will not be reached.
 */
export function positionFor(siblings: number[], index: number): number {
  const before = index > 0 ? siblings[index - 1] : undefined;
  const after = index < siblings.length ? siblings[index] : undefined;

  if (before === undefined && after === undefined) return POSITION_STEP;
  if (before === undefined) return after! - POSITION_STEP;
  if (after === undefined) return before + POSITION_STEP;
  return (before + after) / 2;
}
