"use client";

import { Archive, ChevronDown, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { UserMenu } from "@/components/app-shell/user-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/tasks", label: "Tasks", icon: LayoutGrid },
  { href: "/projects", label: "Projects", icon: Archive },
];

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-[260px] shrink-0 flex-col gap-4 border-r bg-sidebar p-3",
        className,
      )}
    >
      <UserMenu />

      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="flex items-center justify-between px-2 py-1 text-sm font-medium text-sidebar-foreground"
        >
          Workspace
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>

        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
