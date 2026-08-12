import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { UserSummary } from "@/lib/types";

/**
 * Overlapping faces, capped. Shared by the members column and the live
 * presence strip so a team reads the same in both places.
 */
export function AvatarStack({
  users,
  total,
  max = 4,
  className,
  title,
  ring = "ring-background",
}: {
  users: UserSummary[];
  /** Team size when it exceeds what was fetched; defaults to users.length. */
  total?: number;
  max?: number;
  className?: string;
  title?: string;
  ring?: string;
}) {
  const shown = users.slice(0, max);
  const hidden = (total ?? users.length) - shown.length;

  return (
    <span className={cn("flex items-center", className)} title={title}>
      {shown.map((user) => (
        // -space-x would need a wrapper per item to keep the title; a plain
        // negative margin on all but the first does the same in one class.
        <Avatar
          key={user.id}
          title={user.name}
          className={cn("size-6 ring-2", ring, shown[0] !== user && "-ml-2")}
        >
          <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
          <AvatarFallback className="text-[9px]">
            {user.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}

      {hidden > 0 ? (
        <span
          className={cn(
            "-ml-2 flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2",
            ring,
          )}
        >
          +{hidden}
        </span>
      ) : null}
    </span>
  );
}
