import assert from "node:assert/strict";
import { test } from "node:test";

// Explicit .ts extension: Node's native type stripping resolves ESM specifiers
// literally, unlike the bundler resolution Next uses for app code.
import { DEFAULT_THEME, parseTheme } from "./theme.ts";

test("returns the default when nothing is stored", () => {
  assert.deepEqual(parseTheme(null), DEFAULT_THEME);
  assert.deepEqual(parseTheme(""), DEFAULT_THEME);
});

test("round-trips a valid theme", () => {
  assert.deepEqual(parseTheme('{"mode":"dark","accent":"emerald"}'), {
    mode: "dark",
    accent: "emerald",
  });
});

test("falls back per-field, keeping the valid half", () => {
  assert.deepEqual(parseTheme('{"mode":"dark","accent":"chartreuse"}'), {
    mode: "dark",
    accent: DEFAULT_THEME.accent,
  });
  assert.deepEqual(parseTheme('{"mode":"neon","accent":"rose"}'), {
    mode: DEFAULT_THEME.mode,
    accent: "rose",
  });
});

test("survives corrupt storage without throwing", () => {
  assert.deepEqual(parseTheme("not json"), DEFAULT_THEME);
  assert.deepEqual(parseTheme("null"), DEFAULT_THEME);
  assert.deepEqual(parseTheme("[]"), DEFAULT_THEME);
  assert.deepEqual(parseTheme('"dark"'), DEFAULT_THEME);
});
