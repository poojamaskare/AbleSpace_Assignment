import { cn } from "@/lib/utils";

/** The Pyramid mark: a dark rounded square with a white pyramid glyph. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-[6px] bg-foreground",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-3 text-background"
        fill="none"
      >
        <path d="M12 4 21 20H3L12 4Z" fill="currentColor" />
        <path d="M12 4v16" stroke="var(--foreground)" strokeWidth="2.5" />
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-sm font-semibold tracking-tight">Pyramid</span>
    </span>
  );
}
