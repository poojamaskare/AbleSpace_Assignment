"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState, useTransition } from "react";

import { GoogleIcon } from "@/components/brand/google-icon";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type CodeClient = { requestCode: () => void };
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (opts: {
            client_id: string;
            scope: string;
            ux_mode: "popup";
            callback: (res: { code?: string; error?: string }) => void;
          }) => CodeClient;
        };
      };
    };
  }
}

/**
 * Google sign-in via the Identity Services popup *code* flow rather than the
 * ID-token flow: the code flow leaves the button markup to us, so it can match
 * the design, whereas the ID-token flow only comes as Google's own rendered
 * button or One Tap. The code is redeemed server-side, where the secret lives.
 */
export function GoogleLoginButton() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function exchange(code: string) {
    try {
      const { accessToken } = await apiFetch<{ accessToken: string }>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setToken(accessToken);
      startTransition(() => router.replace("/tasks"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in with Google");
    }
  }

  function signIn() {
    setError(null);
    const oauth2 = window.google?.accounts.oauth2;
    if (!oauth2 || !CLIENT_ID) return;

    oauth2
      .initCodeClient({
        client_id: CLIENT_ID,
        scope: "openid email profile",
        ux_mode: "popup",
        callback: ({ code }) => {
          // No code means the user closed the popup or denied consent —
          // nothing went wrong, so say nothing.
          if (code) void exchange(code);
        },
      })
      .requestCode();
  }

  return (
    <div className="space-y-2">
      {CLIENT_ID ? (
        <Script
          src="https://accounts.google.com/gsi/client"
          onReady={() => setReady(true)}
        />
      ) : null}

      <Button
        variant="outline"
        className="h-10 w-full rounded-full"
        onClick={signIn}
        // Without a client ID the button can never work; leave it as the
        // design's disabled state instead of failing on click.
        disabled={!CLIENT_ID || !ready || pending}
      >
        <GoogleIcon className="size-4" />
        {pending ? "Signing in…" : "Login with Google"}
      </Button>

      {error ? (
        <p role="alert" className="text-center text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
