"use client";

import { MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PriorityIndicator } from "@/components/board/priority-indicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { Priority, UserSummary } from "@/lib/types";

type ProjectRow = {
  id: string;
  name: string;
  priority: Priority;
  dueDate: string | null;
  lead: UserSummary | null;
  _count: { tasks: number };
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);

  const load = useCallback(
    () =>
      apiFetch<ProjectRow[]>("/projects")
        .then(setProjects)
        .catch((e: Error) => setError(e.message)),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function createProject(name: string) {
    try {
      const created = await apiFetch<ProjectRow>("/projects", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setProjects((current) => [...(current ?? []), created]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create project");
    }
  }

  async function deleteProject(id: string) {
    const previous = projects;
    setProjects((current) => current?.filter((p) => p.id !== id) ?? current);

    try {
      await apiFetch(`/projects/${id}`, { method: "DELETE" });
    } catch (e) {
      setProjects(previous);
      setError(e instanceof Error ? e.message : "Could not delete project");
    }
  }

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? (projects ?? []).filter((p) => p.name.toLowerCase().includes(needle))
    : (projects ?? []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <h1 className="flex-1 text-xl font-semibold tracking-tight">Projects</h1>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
            className="h-9 w-48 pl-8 sm:w-56"
          />
        </div>

        <Button className="h-9 gap-1.5" onClick={() => setComposing(true)}>
          <Plus className="size-4" />
          Add Project
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-6">
        {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}

        {projects === null ? (
          <p className="text-sm text-muted-foreground">Loading projects…</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="bg-muted/60 text-left">
                  {["Projects", "Priority", "Lead", "Due Date", "Tasks"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-xs font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((project) => (
                  <tr key={project.id} className="border-t hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-sm hover:underline"
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <PriorityIndicator priority={project.priority} />
                    </td>
                    <td className="px-4 py-2.5">
                      {project.lead ? (
                        <span className="flex items-center gap-1.5">
                          <Avatar className="size-6">
                            <AvatarImage
                              src={project.lead.avatarUrl ?? undefined}
                              alt={project.lead.name}
                            />
                            <AvatarFallback className="text-[9px]">
                              {project.lead.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">
                            {project.lead.name}
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {project.dueDate
                        ? new Date(project.dueDate).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {project._count.tasks}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Actions for ${project.name}`}
                          className="rounded p-1 text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem asChild>
                            <Link href={`/projects/${project.id}`}>Open project</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/tasks?project=${project.id}`}>Open board</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            className="gap-2"
                            onSelect={() => void deleteProject(project.id)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}

                <tr className="border-t">
                  <td colSpan={6} className="px-4 py-2">
                    {composing ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const input = e.currentTarget.elements[0] as HTMLInputElement;
                          const name = input.value.trim();
                          if (name) void createProject(name);
                          setComposing(false);
                        }}
                      >
                        <input
                          autoFocus
                          onBlur={() => setComposing(false)}
                          onKeyDown={(e) => e.key === "Escape" && setComposing(false)}
                          placeholder="Project name…"
                          aria-label="New project name"
                          className="w-full bg-transparent text-sm outline-none"
                        />
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setComposing(true)}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="size-4" />
                        Add Projects
                      </button>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
