"use client";

import { useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/sheet";
import { Menu } from "lucide-react";
import { SidebarNav } from "./Sidebar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export function Header() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="flex md:hidden h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile Nav Toggle */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle mobile menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
            <VisuallyHidden>
              <SheetTitle>Navigation Menu</SheetTitle>
            </VisuallyHidden>
            <div className="flex h-16 items-center px-6 border-b">
              <span className="text-xl font-bold font-mono tracking-tighter text-primary">Stock</span>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <ThemeToggle />
        {session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                  <AvatarFallback>{session.user.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {session.user.name && <p className="font-medium">{session.user.name}</p>}
                  {session.user.email && (
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {session.user.email}
                    </p>
                  )}
                </div>
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
