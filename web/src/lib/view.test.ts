import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_VIEW, FIELDS, parseView } from "./view.ts";

test("returns defaults when nothing is stored", () => {
  assert.deepEqual(parseView(null), DEFAULT_VIEW);
  assert.deepEqual(parseView(""), DEFAULT_VIEW);
});

test("round-trips a valid preference set", () => {
  const stored = JSON.stringify({
    mode: "list",
    visible: { ...DEFAULT_VIEW.visible, status: true },
  });
  const parsed = parseView(stored);
  assert.equal(parsed.mode, "list");
  assert.equal(parsed.visible.status, true);
});

test("falls back on an unknown view mode", () => {
  assert.equal(parseView('{"mode":"gantt"}').mode, DEFAULT_VIEW.mode);
});

test("always returns every known field", () => {
  const parsed = parseView('{"mode":"list","visible":{"priority":false}}');
  for (const { key } of FIELDS) {
    assert.equal(typeof parsed.visible[key], "boolean", `missing ${key}`);
  }
  assert.equal(parsed.visible.priority, false);
});

test("drops fields that no longer exist", () => {
  const parsed = parseView('{"visible":{"astrology":true}}');
  assert.ok(!("astrology" in parsed.visible));
});

test("survives corrupt storage", () => {
  assert.deepEqual(parseView("not json"), DEFAULT_VIEW);
  assert.deepEqual(parseView("[]"), DEFAULT_VIEW);
  assert.deepEqual(parseView("null"), DEFAULT_VIEW);
});
