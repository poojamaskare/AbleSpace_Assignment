"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { DueDatePicker } from "@/components/task/due-date-picker";
import { PrioritySelect } from "@/components/task/priority-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Column, Priority } from "@/lib/types";

export function AddTaskDialog({
  columns,
  onCreate,
}: {
  columns: Column[];
  onCreate: (input: {
    title: string;
    description?: string;
    columnId: string;
    priority: Priority;
    dueDate: string | null;
  }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState(columns[0]?.id ?? "");
  const [priority, setPriority] = useState<Priority>("NONE");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setColumnId(columns[0]?.id ?? "");
    setPriority("NONE");
    setDueDate(null);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    try {
      await onCreate({
        title: trimmed,
        description: description.trim() || undefined,
        columnId,
        priority,
        dueDate,
      });
      reset();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="h-9 gap-1.5 px-2.5 sm:px-3" aria-label="Add Task">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Task</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            aria-label="Task title"
            required
          />

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            aria-label="Task description"
            rows={3}
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              aria-label="Column"
              className="h-8 rounded-md border bg-transparent px-2 text-sm"
            >
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>

            <PrioritySelect value={priority} onChange={setPriority} />
            <DueDatePicker value={dueDate} onChange={setDueDate} />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
