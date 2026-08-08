"use client";

import { createContext, use, useCallback, useEffect, useState } from "react";

import {
  DEFAULT_THEME,
  STORAGE_KEY,
  applyTheme,
  parseTheme,
  type Accent,
  type Mode,
  type Theme,
} from "@/lib/theme";

type ThemeContextValue = Theme & {
  setMode: (mode: Mode) => void;
  setAccent: (accent: Accent) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Starts at the default so server and client markup agree; the inline script
  // in <head> has already painted the real theme, so there is nothing to flash.
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    setTheme(parseTheme(localStorage.getItem(STORAGE_KEY)));
  }, []);

  const update = useCallback((next: Theme) => {
    setTheme(next);
    applyTheme(next, document.documentElement);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setMode = useCallback((mode: Mode) => update({ ...theme, mode }), [theme, update]);
  const setAccent = useCallback((accent: Accent) => update({ ...theme, accent }), [theme, update]);

  return (
    <ThemeContext value={{ ...theme, setMode, setAccent }}>{children}</ThemeContext>
  );
}

export function useTheme() {
  const ctx = use(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
