"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

type User = { id: string; name: string; email: string; isGuest: boolean };

// Placeholder destination for the guest-login redirect. The real board,
// sidebar and theme switcher replace this next.
export default function TasksPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<User>("/auth/me")
      .then(setUser)
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4">
      <Logo />
      <p className="text-sm text-muted-foreground">
        {user ? `Signed in as ${user.name}` : "Loading session…"}
      </p>
    </main>
  );
}
