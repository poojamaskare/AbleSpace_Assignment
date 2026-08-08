"use client";

import { CalendarDays, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DueDatePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
}) {
  const selected = value ? new Date(value) : undefined;

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs font-normal"
          >
            <CalendarDays className="size-3.5" />
            {selected
              ? selected.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
              : "Set date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => onChange(date ? date.toISOString() : null)}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {selected ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label="Clear due date"
          onClick={() => onChange(null)}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
