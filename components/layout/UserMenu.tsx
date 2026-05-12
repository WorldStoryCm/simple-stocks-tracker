"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { useTheme } from "@/lib/useTheme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu";

export function UserMenu({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

  if (!session?.user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex flex-col gap-0.5 p-2">
          <span className="text-sm font-medium text-text-primary">
            {session.user.name}
          </span>
          <span className="text-xs text-text-tertiary truncate">
            {session.user.email}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            toggleTheme();
          }}
        >
          {theme === "dark" ? (
            <>
              <Sun className="mr-2 h-3.5 w-3.5" />
              Switch to light
            </>
          ) : (
            <>
              <Moon className="mr-2 h-3.5 w-3.5" />
              Switch to dark
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut()}>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
