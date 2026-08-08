import type { Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRIORITY_META: Record<Priority, { label: string; bars: number; className: string }> =
  {
    NONE: { label: "No Priority", bars: 0, className: "text-priority-none" },
    LOW: { label: "Low", bars: 1, className: "text-priority-low" },
    MEDIUM: { label: "Medium", bars: 2, className: "text-priority-medium" },
    HIGH: { label: "High", bars: 3, className: "text-priority-high" },
    URGENT: { label: "Urgent", bars: 4, className: "text-priority-urgent" },
  };

/**
 * The design draws priority as a small ascending bar chart: filled bars up to
 * the level, muted bars beyond it. Built from divs rather than an icon so the
 * fill count is data-driven instead of five separate SVGs.
 */
export function PriorityIndicator({
  priority,
  showLabel = true,
  className,
}: {
  priority: Priority;
  showLabel?: boolean;
  className?: string;
}) {
  const meta = PRIORITY_META[priority];

  return (
    <span className={cn("inline-flex items-center gap-1.5", meta.className, className)}>
      <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            style={{ height: `${(i + 1) * 25}%` }}
            className={cn(
              "w-[3px] rounded-[1px]",
              i < meta.bars ? "bg-current" : "bg-current/25",
            )}
          />
        ))}
      </span>
      {showLabel ? <span className="text-xs">{meta.label}</span> : null}
      <span className="sr-only">Priority: {meta.label}</span>
    </span>
  );
}

export { PRIORITY_META };
