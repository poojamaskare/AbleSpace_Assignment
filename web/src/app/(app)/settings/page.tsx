"use client";

import { Moon, Palette, Sun, User } from "lucide-react";
import { useState } from "react";

import { useSession, useSignOut } from "@/components/auth/session-provider";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { ACCENTS, MODES, type Accent } from "@/lib/theme";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "theme", label: "Theme", icon: Sun },
  { id: "color", label: "Color", icon: Palette },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/** Mirrors the --primary values in globals.css for the swatches. */
const ACCENT_SWATCH: Record<Accent, string> = {
  amber: "oklch(0.769 0.188 70.08)",
  blue: "oklch(0.606 0.25 292.717)",
  pink: "oklch(0.656 0.241 354.308)",
  rose: "oklch(0.586 0.253 17.585)",
  emerald: "oklch(0.596 0.145 163.225)",
  black: "oklch(0.205 0 0)",
};

const label = (v: string) => v[0].toUpperCase() + v.slice(1);

/** One labelled row of the profile card, matching the design's split layout. */
function Row({
  label: rowLabel,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 last:border-b-0 sm:px-6">
      <div>
        <p className="text-sm font-medium">{rowLabel}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const user = useSession();
  const signOut = useSignOut();
  const { mode, accent, setMode, setAccent } = useTheme();

  const [section, setSection] = useState<SectionId>("profile");
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    title: user.title ?? "",
    username: user.username ?? "",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Saves on blur — the design shows plain fields with no Save button. */
  async function save(field: keyof typeof form, value: string) {
    const trimmed = value.trim();
    if (trimmed === (user[field] ?? "")) return;

    setError(null);
    try {
      await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ [field]: trimmed }),
      });
      setStatus("Saved");
      setTimeout(() => setStatus(null), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    }
  }

  const initials = form.name.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b p-3 lg:w-56 lg:flex-col lg:border-b-0 lg:border-r">
        {SECTIONS.map(({ id, label: sectionLabel, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            aria-current={section === id ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              section === id
                ? "bg-accent font-medium"
                : "text-muted-foreground hover:bg-accent/60",
            )}
          >
            {id === "color" ? (
              <span
                className="size-4 rounded-[4px]"
                style={{ background: ACCENT_SWATCH[accent] }}
              />
            ) : (
              <Icon className="size-4" />
            )}
            {sectionLabel}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl p-4 sm:p-6">
          {section === "profile" ? (
            <>
              <h1 className="mb-6 text-2xl font-semibold tracking-tight">Profile</h1>

              <div className="rounded-xl border">
                <Row label="Profile picture">
                  <Avatar className="size-10">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Row>

                <Row label="Email">
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    onBlur={(e) => void save("email", e.target.value)}
                    aria-label="Email"
                    type="email"
                    className="h-9 w-full sm:w-64"
                  />
                </Row>

                <Row label="Full name">
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    onBlur={(e) => void save("name", e.target.value)}
                    aria-label="Full name"
                    className="h-9 w-full sm:w-64"
                  />
                </Row>

                <Row label="Title" hint="Your job title or role">
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    onBlur={(e) => void save("title", e.target.value)}
                    placeholder="Designer"
                    aria-label="Title"
                    className="h-9 w-full sm:w-64"
                  />
                </Row>

                <Row label="Username" hint="One word, like a nickname or first name">
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    onBlur={(e) => void save("username", e.target.value)}
                    placeholder="Dexuser"
                    aria-label="Username"
                    className="h-9 w-full sm:w-64"
                  />
                </Row>
              </div>

              <div aria-live="polite" className="mt-2 h-5 text-xs">
                {error ? (
                  <span className="text-destructive">{error}</span>
                ) : status ? (
                  <span className="text-muted-foreground">{status}</span>
                ) : null}
              </div>

              <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight">
                Workspace access
              </h2>
              <div className="rounded-xl border">
                <Row label="Remove yourself from the workspace">
                  <Button
                    variant="ghost"
                    className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                    onClick={signOut}
                  >
                    Leave Workspace
                  </Button>
                </Row>
              </div>
            </>
          ) : null}

          {section === "theme" ? (
            <>
              <h1 className="mb-6 text-2xl font-semibold tracking-tight">Theme</h1>
              <div className="grid gap-3 sm:grid-cols-2">
                {MODES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    aria-pressed={mode === value}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-accent",
                      mode === value && "border-primary ring-2 ring-primary/30",
                    )}
                  >
                    {value === "light" ? (
                      <Sun className="size-5" />
                    ) : (
                      <Moon className="size-5" />
                    )}
                    <span className="text-sm font-medium">{label(value)}</span>
                    {mode === value ? (
                      <span className="ml-auto text-xs text-muted-foreground">Active</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {section === "color" ? (
            <>
              <h1 className="mb-6 text-2xl font-semibold tracking-tight">Color</h1>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ACCENTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAccent(value)}
                    aria-pressed={accent === value}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-accent",
                      accent === value && "border-primary ring-2 ring-primary/30",
                    )}
                  >
                    <span
                      className="size-5 rounded-md"
                      style={{ background: ACCENT_SWATCH[value] }}
                    />
                    <span className="text-sm font-medium">{label(value)}</span>
                    {accent === value ? (
                      <span className="ml-auto text-xs text-muted-foreground">Active</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
