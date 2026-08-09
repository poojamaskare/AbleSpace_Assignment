"use client";

import { Columns3, LayoutGrid, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FIELDS, type ViewPrefs } from "@/lib/view";
import { cn } from "@/lib/utils";

/** The design's "Fields" dropdown: a List/Board segmented toggle above a set of
 *  field-visibility checkboxes. Both persist across refreshes. */
export function ViewMenu({
  view,
  onChange,
}: {
  view: ViewPrefs;
  onChange: (view: ViewPrefs) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 gap-1.5">
          <Columns3 className="size-4" />
          Fields
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-2">
        <div className="mb-1 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(
            [
              { mode: "list", label: "List", icon: List },
              { mode: "board", label: "Board", icon: LayoutGrid },
            ] as const
          ).map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange({ ...view, mode })}
              aria-pressed={view.mode === mode}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                view.mode === mode
                  ? "bg-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <DropdownMenuSeparator />

        {FIELDS.map(({ key, label }) => (
          <label
            key={key}
            className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent"
          >
            {label}
            <Checkbox
              checked={view.visible[key]}
              onCheckedChange={(checked) =>
                onChange({
                  ...view,
                  visible: { ...view.visible, [key]: checked === true },
                })
              }
            />
          </label>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
