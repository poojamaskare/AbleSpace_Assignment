import assert from "node:assert/strict";
import { test } from "node:test";

import { moveTask } from "./board.ts";
import type { Column, Task } from "./types.ts";

const task = (id: string, columnId: string) =>
  ({
    id,
    title: id,
    description: null,
    priority: "NONE",
    startDate: null,
    dueDate: null,
    position: 0,
    columnId,
    projectId: "p",
    assignees: [],
    labels: [],
    _count: { subtasks: 0, comments: 0 },
  }) satisfies Task;

const board = (): Column[] => [
  { id: "todo", name: "To Do", position: 1000, tasks: [task("a", "todo"), task("b", "todo"), task("c", "todo")] },
  { id: "doing", name: "Doing", position: 2000, tasks: [task("d", "doing")] },
  { id: "done", name: "Completed", position: 3000, tasks: [] },
];

const ids = (columns: Column[], columnId: string) =>
  columns.find((c) => c.id === columnId)!.tasks.map((t) => t.id);

test("reorders within a column", () => {
  const result = moveTask(board(), "a", "c");
  assert.ok(result);
  assert.deepEqual(ids(result.columns, "todo"), ["b", "c", "a"]);
  assert.equal(result.columnId, "todo");
});

test("moving down does not overshoot by one", () => {
  const result = moveTask(board(), "a", "b");
  assert.ok(result);
  // "a" lands exactly where "b" was, not past it.
  assert.deepEqual(ids(result.columns, "todo"), ["b", "a", "c"]);
  assert.equal(result.index, 1);
});

test("moves across columns onto another task", () => {
  const result = moveTask(board(), "a", "d");
  assert.ok(result);
  assert.deepEqual(ids(result.columns, "todo"), ["b", "c"]);
  assert.deepEqual(ids(result.columns, "doing"), ["a", "d"]);
  assert.equal(result.columnId, "doing");
  assert.equal(result.index, 0);
});

test("drops into an empty column", () => {
  const result = moveTask(board(), "a", "done");
  assert.ok(result);
  assert.deepEqual(ids(result.columns, "done"), ["a"]);
  assert.equal(result.columnId, "done");
  assert.equal(result.index, 0);
});

test("dropping a card on itself is a no-op", () => {
  assert.equal(moveTask(board(), "a", "a"), null);
});

test("unknown ids are ignored", () => {
  assert.equal(moveTask(board(), "nope", "todo"), null);
  assert.equal(moveTask(board(), "a", "nowhere"), null);
});

test("does not mutate the input board", () => {
  const original = board();
  moveTask(original, "a", "d");
  assert.deepEqual(ids(original, "todo"), ["a", "b", "c"]);
  assert.deepEqual(ids(original, "doing"), ["d"]);
});
