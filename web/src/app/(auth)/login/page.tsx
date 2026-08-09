import type { Metadata } from "next";

import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { GuestLoginButton } from "@/components/auth/guest-login-button";
import { ResumeSession } from "@/components/auth/resume-session";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Log in · Pyramid",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-10">
      <ResumeSession />
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
          <GoogleLoginButton />
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
