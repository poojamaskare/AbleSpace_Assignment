"use client";

import { Check, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ProjectOption = { id: string; name: string };

/** Switches which project's board the Tasks screen shows. Without it a second
 *  project is unreachable — /tasks only ever opened the default one. */
export function ProjectSwitcher({
  projects,
  activeId,
  onSelect,
}: {
  projects: ProjectOption[];
  activeId: string | null;
  onSelect: (projectId: string) => void;
}) {
  const active = projects.find((p) => p.id === activeId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xl font-semibold tracking-tight outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
        {active?.name ?? "Tasks"}
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Projects
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            className="gap-2"
            onSelect={() => onSelect(project.id)}
          >
            <span className="truncate">{project.name}</span>
            {project.id === activeId ? <Check className="ml-auto size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
