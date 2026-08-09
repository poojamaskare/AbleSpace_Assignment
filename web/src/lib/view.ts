export const VIEW_MODES = ["board", "list"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

/**
 * Columns offered by the Fields menu. The label is what the menu shows; the key
 * is what each view checks before rendering that cell. Adding a field here is
 * the only change needed to expose it in both views and the menu.
 */
export const FIELDS = [
  { key: "priority", label: "Priority" },
  { key: "members", label: "Members" },
  { key: "dueDate", label: "Due Date" },
  { key: "labels", label: "Labels" },
  { key: "status", label: "Status" },
  { key: "reporter", label: "Reporter" },
] as const;

export type FieldKey = (typeof FIELDS)[number]["key"];

export type ViewPrefs = {
  mode: ViewMode;
  visible: Record<FieldKey, boolean>;
};

export const STORAGE_KEY = "pyramid-view";

export const DEFAULT_VIEW: ViewPrefs = {
  mode: "board",
  visible: {
    priority: true,
    members: true,
    dueDate: true,
    labels: true,
    status: false,
    reporter: false,
  },
};

/**
 * Coerce stored preferences into a valid shape. Unknown keys are dropped and
 * missing ones fall back, so a stale entry written before a field was added or
 * renamed can never leave a view with undefined columns.
 */
export function parseView(raw: string | null | undefined): ViewPrefs {
  if (!raw) return DEFAULT_VIEW;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_VIEW;
  }

  if (typeof parsed !== "object" || parsed === null) return DEFAULT_VIEW;

  const { mode, visible } = parsed as Record<string, unknown>;
  const storedVisible =
    typeof visible === "object" && visible !== null
      ? (visible as Record<string, unknown>)
      : {};

  return {
    mode: VIEW_MODES.includes(mode as ViewMode) ? (mode as ViewMode) : DEFAULT_VIEW.mode,
    visible: Object.fromEntries(
      FIELDS.map(({ key }) => [
        key,
        typeof storedVisible[key] === "boolean"
          ? (storedVisible[key] as boolean)
          : DEFAULT_VIEW.visible[key],
      ]),
    ) as Record<FieldKey, boolean>,
  };
}
