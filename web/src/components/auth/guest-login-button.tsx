"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";

type GuestSession = { accessToken: string };

export function GuestLoginButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function login() {
    setError(null);
    try {
      const { accessToken } = await apiFetch<GuestSession>("/auth/guest", {
        method: "POST",
      });
      setToken(accessToken);
      startTransition(() => router.replace("/tasks"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start a guest session");
    }
  }

  return (
    <div className="space-y-2">
      <Button
        className="h-10 w-full rounded-full"
        onClick={() => void login()}
        disabled={pending}
      >
        {pending ? "Signing in…" : "Continue as Guest"}
      </Button>
      {error ? (
        <p role="alert" className="text-center text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
