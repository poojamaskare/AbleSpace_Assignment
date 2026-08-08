"use client";

import { Plus, Tag } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiFetch } from "@/lib/api";
import type { Label } from "@/lib/types";

/**
 * Reads the project's labels rather than a fixed list, and can create new ones
 * inline — labels are per-project data, so what shows here depends entirely on
 * what the project owns.
 */
export function LabelPicker({
  projectId,
  selected,
  onChange,
}: {
  projectId: string;
  selected: Label[];
  onChange: (labelIds: string[]) => void;
}) {
  const [available, setAvailable] = useState<Label[] | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Label[]>(`/projects/${projectId}/labels`)
      .then(setAvailable)
      .catch(() => setAvailable([]));
  }, [projectId]);

  const selectedIds = new Set(selected.map((l) => l.id));

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  async function createLabel() {
    const name = draft.trim();
    if (!name) return;
    setError(null);

    try {
      const created = await apiFetch<Label>(`/projects/${projectId}/labels`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setAvailable((prev) => [...(prev ?? []), created]);
      onChange([...selectedIds, created.id]);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create label");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((label) => (
        <span
          key={label.id}
          className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
        >
          <Tag className="size-3" />
          {label.name}
        </span>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-xs">
            <Plus className="size-3" />
            Label
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2">
          <div className="max-h-52 space-y-0.5 overflow-y-auto">
            {available === null ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">Loading…</p>
            ) : available.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">
                No labels yet — create one below.
              </p>
            ) : (
              available.map((label) => (
                <label
                  key={label.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={selectedIds.has(label.id)}
                    onCheckedChange={() => toggle(label.id)}
                  />
                  {label.name}
                </label>
              ))
            )}
          </div>

          <form
            className="mt-2 flex gap-1 border-t pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              void createLabel();
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="New label…"
              aria-label="New label name"
              className="h-7 text-xs"
            />
            <Button type="submit" size="sm" className="h-7 px-2 text-xs">
              Add
            </Button>
          </form>
          {error ? (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
