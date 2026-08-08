import type { Metadata } from "next";

import { GuestLoginButton } from "@/components/auth/guest-login-button";
import { GoogleIcon } from "@/components/brand/google-icon";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Log in · Pyramid",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-10">
      <Logo />

      <div className="w-full max-w-[400px] rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="space-y-1.5 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            Let&apos;s get back on track
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email below to login to your account.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <GuestLoginButton />

          {/* Google sign-in is drawn in the design but out of scope for the
              assignment's guest-login requirement — see README deviations. */}
          <Button variant="outline" className="h-10 w-full rounded-full" disabled>
            <GoogleIcon className="size-4" />
            Login with Google
          </Button>
        </div>
      </div>

      <p className="max-w-[280px] text-center text-xs leading-relaxed text-muted-foreground">
        By clicking continue, you agree to our{" "}
        <a href="#" className="underline underline-offset-2 hover:text-foreground">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline underline-offset-2 hover:text-foreground">
          Privacy Policy
        </a>
      </p>
    </main>
  );
}
