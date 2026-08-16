"use client";

import { Check, Copy, Plus } from "lucide-react";
import { useState } from "react";

import { useSession } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Mode = "create" | "join";

/**
 * The two halves of getting a board: start one, or join a teammate's with the
 * six-digit code they shared.
 *
 * Creating does not close the dialog — it swaps to the code, because a code the
 * user never saw is a project nobody can be invited to. Closing is deliberate.
 */
export function AddProjectDialog({
  onCreate,
  onJoin,
}: {
  onCreate: (name: string) => Promise<{ name: string; code: string }>;
  onJoin: (code: string) => Promise<unknown>;
}) {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [created, setCreated] = useState<{ name: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close(next: boolean) {
    setOpen(next);
    if (next) return;
    // Reset only on the way out, so the code stays readable while open.
    setMode("create");
    setName("");
    setCode("");
    setCreated(null);
    setCopied(false);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (mode === "create") {
        const trimmed = name.trim();
        if (!trimmed) return;
        setCreated(await onCreate(trimmed));
      } else {
        await onJoin(code);
        close(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!created) return;
    await navigator.clipboard.writeText(created.code);
    setCopied(true);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button className="h-9 gap-1.5">
          <Plus className="size-4" />
          Add Project
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px]">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>{created.name} is ready</DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground">
              Share this code with your team. Anyone who enters it joins this
              project — and only this one.
            </p>

            <div className="flex items-center justify-center gap-3 rounded-lg border bg-muted/40 py-5">
              <span className="font-mono text-3xl font-semibold tracking-[0.3em]">
                {created.code}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Copy join code"
                onClick={() => void copy()}
              >
                {copied ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => close(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={(e) => void submit(e)}>
            <DialogHeader>
              <DialogTitle>Add project</DialogTitle>
            </DialogHeader>

            <div
              role="tablist"
              className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
            >
              {(["create", "join"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => {
                    setMode(value);
                    setError(null);
                  }}
                  className={cn(
                    "rounded-md py-1.5 text-sm capitalize transition-colors",
                    mode === value
                      ? "bg-background font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {value === "create" ? "Create new" : "Join with code"}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {mode === "create" ? (
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project name"
                  aria-label="Project name"
                />
              ) : (
                <Input
                  autoFocus
                  value={code}
                  // Digits only, capped at six: the field cannot hold anything
                  // the API would reject.
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  placeholder="000000"
                  aria-label="Six-digit join code"
                  className="text-center font-mono text-lg tracking-[0.3em]"
                />
              )}

              {/* Said before joining, not discovered afterwards through a
                  failed edit. */}
              {mode === "join" && session.isGuest ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  As a guest you will join as a viewer — you can watch the board
                  live, but not change it. Sign in with Google to edit.
                </p>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <DialogFooter className="mt-4">
              <Button
                type="submit"
                disabled={
                  busy || (mode === "create" ? !name.trim() : code.length !== 6)
                }
              >
                {mode === "create" ? "Create project" : "Join project"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
