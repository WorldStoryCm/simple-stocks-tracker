"use client";

import { useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/sheet";
import { Bell, Menu, Plus, Search } from "lucide-react";
import { SidebarNav } from "./Sidebar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { SyncStatus } from "@/components/rsi/SyncStatus";

export function Header() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-[color:var(--background)]/85 backdrop-blur-xl px-4 md:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="icon" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[280px] p-0 flex flex-col bg-[color:var(--sidebar-bg)] border-r border-[color:var(--sidebar-border)]"
        >
          <VisuallyHidden>
            <SheetTitle>Navigation Menu</SheetTitle>
          </VisuallyHidden>
          <div className="flex-1 overflow-y-auto py-4">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="hidden md:flex flex-1 max-w-xl items-center gap-2 rounded-md border border-border bg-[color:var(--surface-1)] px-3 py-2 text-sm text-text-tertiary focus-within:border-[color:var(--info)]/60 focus-within:bg-[color:var(--surface-2)] transition-colors">
        <Search className="h-4 w-4 shrink-0" />
        <input
          type="text"
          placeholder="Search symbols, trades, notes…"
          className="flex-1 bg-transparent outline-none placeholder:text-text-tertiary text-text-primary"
        />
        <kbd className="hidden lg:inline-flex items-center gap-1 rounded border border-border bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
          ⌘K
        </kbd>
      </div>

      <div className="flex flex-1 md:flex-initial items-center justify-end gap-2">
        <SyncStatus />

        <Button
          variant="icon"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[color:var(--negative)]" />
        </Button>

        <Button
          variant="default"
          size="sm"
          className="hidden sm:inline-flex"
        >
          <Plus className="h-4 w-4" />
          Add Trade
        </Button>

        {session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-full [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))] text-xs font-semibold text-white shadow-[var(--shadow-glow-brand)] transition-transform hover:scale-105"
                aria-label="Account menu"
              >
                {session.user.name?.charAt(0).toUpperCase() || "U"}
              </button>
            </DropdownMenuTrigger>
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
              <DropdownMenuItem onSelect={() => signOut()}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
