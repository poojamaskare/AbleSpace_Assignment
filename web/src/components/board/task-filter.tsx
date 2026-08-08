"use client";

import { Filter } from "lucide-react";
import { useEffect, useState } from "react";

import { PriorityIndicator } from "@/components/board/priority-indicator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api";
import type { Label, Priority } from "@/lib/types";

export type Filters = { priorities: Priority[]; labelIds: string[] };

export const EMPTY_FILTERS: Filters = { priorities: [], labelIds: [] };

const PRIORITIES: Priority[] = ["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"];

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export function TaskFilter({
  projectId,
  filters,
  onChange,
}: {
  projectId: string;
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const [labels, setLabels] = useState<Label[]>([]);

  useEffect(() => {
    apiFetch<Label[]>(`/projects/${projectId}/labels`)
      .then(setLabels)
      .catch(() => setLabels([]));
  }, [projectId]);

  const active = filters.priorities.length + filters.labelIds.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 gap-1.5 px-2.5"
          aria-label={active ? `Filter (${active} active)` : "Filter"}
        >
          <Filter className="size-4" />
          {active > 0 ? (
            <span className="rounded-full bg-primary px-1.5 text-[11px] leading-4 text-primary-foreground">
              {active}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Priority
        </DropdownMenuLabel>
        {PRIORITIES.map((priority) => (
          <label
            key={priority}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
          >
            <Checkbox
              checked={filters.priorities.includes(priority)}
              onCheckedChange={() =>
                onChange({ ...filters, priorities: toggle(filters.priorities, priority) })
              }
            />
            <PriorityIndicator priority={priority} />
          </label>
        ))}

        {labels.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Labels
            </DropdownMenuLabel>
            <div className="max-h-44 overflow-y-auto">
              {labels.map((label) => (
                <label
                  key={label.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={filters.labelIds.includes(label.id)}
                    onCheckedChange={() =>
                      onChange({
                        ...filters,
                        labelIds: toggle(filters.labelIds, label.id),
                      })
                    }
                  />
                  {label.name}
                </label>
              ))}
            </div>
          </>
        ) : null}

        {active > 0 ? (
          <>
            <DropdownMenuSeparator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => onChange(EMPTY_FILTERS)}
            >
              Clear filters
            </Button>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
