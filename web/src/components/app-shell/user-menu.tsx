"use client";

import { ChevronsUpDown, Moon, Settings, Sun } from "lucide-react";
import Link from "next/link";

import { useSession } from "@/components/auth/session-provider";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACCENTS, MODES, type Accent } from "@/lib/theme";

/** Swatch colors shown in the Color Mode submenu. These mirror the --primary
 *  values in globals.css; CSS can't be read from TS, so they live in both. */
const ACCENT_SWATCH: Record<Accent, string> = {
  amber: "oklch(0.769 0.188 70.08)",
  blue: "oklch(0.606 0.25 292.717)",
  pink: "oklch(0.656 0.241 354.308)",
  rose: "oklch(0.586 0.253 17.585)",
  emerald: "oklch(0.596 0.145 163.225)",
  black: "oklch(0.205 0 0)",
};

const label = (value: string) => value[0].toUpperCase() + value.slice(1);

function Check({ shown }: { shown: boolean }) {
  return (
    <span className="ml-auto text-xs" aria-hidden={!shown}>
      {shown ? "✓" : ""}
    </span>
  );
}

export function UserMenu() {
  const user = useSession();
  const { mode, accent, setMode, setAccent } = useTheme();

  const initials = user.name.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="size-7">
          <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="flex-1 truncate text-sm font-semibold">{user.name}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-60 p-0" sideOffset={6}>
        <div className="flex flex-col items-center gap-1 px-4 py-4">
          <Avatar className="size-11">
            <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <p className="text-sm font-medium">{user.name}</p>
          <p className="max-w-full truncate text-xs text-muted-foreground">
            {user.email}
          </p>
        </div>

        <DropdownMenuSeparator className="my-0" />

        <div className="p-1">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <Sun className="size-4" />
              Change Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-44">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Theme
                </DropdownMenuLabel>
                {MODES.map((value) => (
                  <DropdownMenuItem
                    key={value}
                    className="gap-2"
                    onSelect={() => setMode(value)}
                  >
                    {value === "light" ? (
                      <Sun className="size-4" />
                    ) : (
                      <Moon className="size-4" />
                    )}
                    {label(value)}
                    <Check shown={mode === value} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <span
                className="size-3.5 rounded-[4px]"
                style={{ background: ACCENT_SWATCH[accent] }}
              />
              Color Mode
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-44">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Color Mode
                </DropdownMenuLabel>
                {ACCENTS.map((value) => (
                  <DropdownMenuItem
                    key={value}
                    className="gap-2"
                    onSelect={() => setAccent(value)}
                  >
                    <span
                      className="size-3.5 rounded-[4px]"
                      style={{ background: ACCENT_SWATCH[value] }}
                    />
                    {label(value)}
                    <Check shown={accent === value} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuItem asChild className="gap-2">
            <Link href="/settings">
              <Settings className="size-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
