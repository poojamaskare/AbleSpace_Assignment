"use client";

import { PanelLeft } from "lucide-react";
import { useState } from "react";

import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { SessionProvider } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Must match the `md:` classes below — Tailwind's md breakpoint. */
const SIDEBAR_BREAKPOINT = "(min-width: 768px)";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // One piece of state drives both breakpoints: on desktop it collapses the
  // fixed sidebar, on mobile it opens the same sidebar inside a sheet.
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SessionProvider>
      <div className="flex h-svh w-full overflow-hidden">
        {/* Tablets (>=768px) have room for the real sidebar; below that it
            lives in the sheet. SIDEBAR_BREAKPOINT keeps this in sync with the
            toggle's matchMedia check — two different values would leave the
            button doing nothing in the gap between them. */}
        <AppSidebar className={cn("hidden md:flex", collapsed && "md:hidden")} />

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-[260px] p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AppSidebar className="w-full border-r-0" />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Toggle sidebar"
              onClick={() => {
                if (window.matchMedia(SIDEBAR_BREAKPOINT).matches) {
                  setCollapsed((v) => !v);
                } else {
                  setOpen(true);
                }
              }}
            >
              <PanelLeft className="size-4" />
            </Button>
            <div className="h-5 w-px bg-border" />
          </header>

          <main className="min-h-0 flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
