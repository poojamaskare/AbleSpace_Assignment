"use client";

import { PriorityIndicator } from "@/components/board/priority-indicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Priority } from "@/lib/types";

const ORDER: Priority[] = ["NONE", "URGENT", "HIGH", "MEDIUM", "LOW"];

export function PrioritySelect({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (priority: Priority) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-1.5 py-1 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
        <PriorityIndicator priority={value} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Priority
        </DropdownMenuLabel>
        {ORDER.map((priority) => (
          <DropdownMenuItem
            key={priority}
            className="gap-2"
            onSelect={() => onChange(priority)}
          >
            <PriorityIndicator priority={priority} />
            <span className="ml-auto text-xs">{value === priority ? "✓" : ""}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
