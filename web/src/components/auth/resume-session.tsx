"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getToken } from "@/lib/auth";

/**
 * Sends a visitor who already has a session straight to their board.
 *
 * Without this, returning to the site lands on /login, and "Continue as Guest"
 * mints a *new* guest — silently orphaning the work done last visit. The token
 * outlives the tab, so the session should too.
 *
 * If the token turns out to be invalid, the app shell clears it and bounces
 * back here; by then getToken() is empty, so this cannot loop.
 */
export function ResumeSession() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) router.replace("/tasks");
  }, [router]);

  return null;
}
