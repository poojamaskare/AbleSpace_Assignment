export const MODES = ["light", "dark"] as const;
export const ACCENTS = ["amber", "blue", "pink", "rose", "emerald", "black"] as const;

export type Mode = (typeof MODES)[number];
export type Accent = (typeof ACCENTS)[number];
export type Theme = { mode: Mode; accent: Accent };

export const STORAGE_KEY = "pyramid-theme";

/** The design's default: light mode, black accent. */
export const DEFAULT_THEME: Theme = { mode: "light", accent: "black" };

/**
 * Coerce anything out of localStorage into a valid Theme. Storage is untrusted:
 * a user can edit it, and a stale value can survive a rename of the options.
 * Every unknown field falls back rather than throwing, so a corrupt entry can
 * never leave the app unstyled.
 */
export function parseTheme(raw: string | null | undefined): Theme {
  if (!raw) return DEFAULT_THEME;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_THEME;
  }

  if (typeof parsed !== "object" || parsed === null) return DEFAULT_THEME;

  const { mode, accent } = parsed as Record<string, unknown>;

  return {
    mode: MODES.includes(mode as Mode) ? (mode as Mode) : DEFAULT_THEME.mode,
    accent: ACCENTS.includes(accent as Accent) ? (accent as Accent) : DEFAULT_THEME.accent,
  };
}

/** Write the theme to the DOM. Mode is a class (shadcn's `dark` variant hook),
 *  accent is an attribute — the two are independent so all 12 combos work. */
export function applyTheme({ mode, accent }: Theme, root: HTMLElement) {
  root.classList.toggle("dark", mode === "dark");
  root.dataset.accent = accent;
  root.style.colorScheme = mode;
}

/**
 * Runs before first paint, inlined into <head>. Without this the page renders
 * with the default theme and then snaps to the stored one — the flash the
 * assignment's "persist across refresh" requirement is really about.
 * Kept dependency-free and self-contained because it executes as a raw string
 * with none of the module graph available.
 */
export const themeScript = `(function(){try{
var d=document.documentElement,s=localStorage.getItem(${JSON.stringify(STORAGE_KEY)}),
m=${JSON.stringify(DEFAULT_THEME.mode)},a=${JSON.stringify(DEFAULT_THEME.accent)};
if(s){var p=JSON.parse(s);
if(${JSON.stringify(MODES)}.indexOf(p.mode)>-1)m=p.mode;
if(${JSON.stringify(ACCENTS)}.indexOf(p.accent)>-1)a=p.accent;}
if(m==="dark")d.classList.add("dark");
d.dataset.accent=a;d.style.colorScheme=m;
}catch(e){}})();`;
