"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { disconnectSocket } from "@/lib/socket";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  username: string | null;
  title: string | null;
  avatarUrl: string | null;
  isGuest: boolean;
};

const SessionContext = createContext<SessionUser | null>(null);

/**
 * Guards the authenticated shell: bounces to /login when there is no token or
 * the token no longer resolves, and renders nothing until the user is known so
 * child components never have to handle a null user.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    apiFetch<SessionUser>("/auth/me")
      .then(setUser)
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  if (!user) return null;

  return <SessionContext value={user}>{children}</SessionContext>;
}

export function useSession() {
  const user = use(SessionContext);
  if (!user) throw new Error("useSession must be used within <SessionProvider>");
  return user;
}

export function useSignOut() {
  const router = useRouter();
  return () => {
    clearToken();
    // The socket authenticated with the old token at connect time; leaving it
    // open would keep the previous guest subscribed to their project's room.
    disconnectSocket();
    router.replace("/login");
  };
}
