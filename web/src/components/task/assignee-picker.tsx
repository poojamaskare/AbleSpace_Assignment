"use client";

import { UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiFetch } from "@/lib/api";
import type { UserSummary } from "@/lib/types";

/**
 * Hands a task to a teammate.
 *
 * The candidates are the project's members, fetched per project rather than
 * hardcoded — who can be assigned changes the moment someone joins by code, and
 * the API rejects anyone who is not a member anyway.
 */
export function AssigneePicker({
  projectId,
  selected,
  onChange,
}: {
  projectId: string;
  selected: UserSummary[];
  onChange: (assigneeIds: string[]) => void;
}) {
  const [members, setMembers] = useState<UserSummary[] | null>(null);

  useEffect(() => {
    apiFetch<UserSummary[]>(`/projects/${projectId}/members`)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [projectId]);

  const selectedIds = new Set(selected.map((u) => u.id));

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((user) => (
        <span
          key={user.id}
          className="flex items-center gap-1.5 rounded-full bg-muted py-0.5 pl-0.5 pr-2 text-xs text-muted-foreground"
        >
          <Avatar className="size-5">
            <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="text-[8px]">
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {user.name}
        </span>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-xs">
            <UserPlus className="size-3" />
            Assign
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 p-2">
          <div className="max-h-52 space-y-0.5 overflow-y-auto">
            {members === null ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">Loading…</p>
            ) : members.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">
                No members yet — share the project code to add teammates.
              </p>
            ) : (
              members.map((user) => (
                <label
                  key={user.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={selectedIds.has(user.id)}
                    onCheckedChange={() => toggle(user.id)}
                  />
                  <Avatar className="size-5">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="text-[8px]">
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user.name}</span>
                </label>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
