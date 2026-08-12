"use client";

import {
  Check,
  Copy,
  LogOut,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PriorityIndicator } from "@/components/board/priority-indicator";
import { useSession } from "@/components/auth/session-provider";
import { AddProjectDialog } from "@/components/project/add-project-dialog";
import { AvatarStack } from "@/components/project/avatar-stack";
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
  code: string;
  priority: Priority;
  dueDate: string | null;
  lead: UserSummary | null;
  members: { user: UserSummary }[];
  _count: { tasks: number; members: number };
};

export default function ProjectsPage() {
  const session = useSession();
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
    const created = await apiFetch<ProjectRow>("/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setProjects((current) => [...(current ?? []), created]);
    // Returned, not swallowed: the dialog shows the join code it carries.
    return created;
  }

  async function joinProject(code: string) {
    const joined = await apiFetch<ProjectRow>("/projects/join", {
      method: "POST",
      body: JSON.stringify({ code }),
    });

    // Re-joining a project already in the list must not duplicate the row.
    setProjects((current) => [
      ...(current ?? []).filter((p) => p.id !== joined.id),
      joined,
    ]);
    return joined;
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
  }

  /** For a leaked code. Members already in keep their access — only the old
   *  code stops working. */
  async function rotateCode(id: string) {
    try {
      const updated = await apiFetch<ProjectRow>(`/projects/${id}/code`, {
        method: "POST",
      });
      setProjects(
        (current) => current?.map((p) => (p.id === id ? updated : p)) ?? current,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change the code");
    }
  }

  async function leaveProject(id: string) {
    const previous = projects;
    setProjects((current) => current?.filter((p) => p.id !== id) ?? current);

    try {
      await apiFetch(`/projects/${id}/members/me`, { method: "DELETE" });
    } catch (e) {
      setProjects(previous);
      setError(e instanceof Error ? e.message : "Could not leave project");
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

        <AddProjectDialog onCreate={createProject} onJoin={joinProject} />
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
                  {[
                    "Projects",
                    "Code",
                    "Priority",
                    "Lead",
                    "Members",
                    "Due Date",
                    "Tasks",
                  ].map((h) => (
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
                      <button
                        type="button"
                        onClick={() => void copyCode(project.code)}
                        title="Copy join code"
                        className="flex items-center gap-1.5 rounded font-mono text-sm tracking-widest text-muted-foreground hover:text-foreground"
                      >
                        {project.code}
                        {copiedCode === project.code ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
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
                    <td className="px-4 py-2.5">
                      <AvatarStack
                        users={project.members.map((m) => m.user)}
                        total={project._count.members}
                        title={`${project._count.members} member${
                          project._count.members === 1 ? "" : "s"
                        }`}
                      />
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
                          {project.lead?.id === session.id ? (
                            <DropdownMenuItem
                              className="gap-2"
                              onSelect={() => void rotateCode(project.id)}
                            >
                              <RefreshCw className="size-4" />
                              New join code
                            </DropdownMenuItem>
                          ) : null}

                          {/* A member who joined by code can only leave —
                              deleting would take the board from the whole
                              team, which is the lead's call. */}
                          {project.lead?.id === session.id ? (
                            <DropdownMenuItem
                              variant="destructive"
                              className="gap-2"
                              onSelect={() => void deleteProject(project.id)}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              variant="destructive"
                              className="gap-2"
                              onSelect={() => void leaveProject(project.id)}
                            >
                              <LogOut className="size-4" />
                              Leave project
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}

                <tr className="border-t">
                  <td colSpan={8} className="px-4 py-2">
                    {composing ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const input = e.currentTarget.elements[0] as HTMLInputElement;
                          const name = input.value.trim();
                          if (name) {
                            void createProject(name).catch((e: Error) =>
                              setError(e.message),
                            );
                          }
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
