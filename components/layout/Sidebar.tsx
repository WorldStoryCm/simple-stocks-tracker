"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowRightLeft, PieChart, Briefcase, Eye, Settings, LineChart } from "lucide-react";
import { cn } from "@/components/component.utils";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Trades", href: "/trades", icon: ArrowRightLeft },
  { name: "Positions", href: "/positions", icon: PieChart },
  { name: "Performance", href: "/performance", icon: LineChart },
  { name: "Platforms", href: "/platforms", icon: Briefcase },
  { name: "Symbols", href: "/symbols", icon: PieChart },  // Reusing icon for simplicity
  { name: "Watchlist", href: "/watchlist", icon: Eye },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  
  return (
    <nav className="flex flex-col gap-1 px-3">
      {navigation.map((item) => {
        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const { data: session } = useSession();

  return (
    <div className="hidden md:flex w-64 flex-col border-r bg-card h-full">
      <div className="flex h-16 items-center px-6 border-b">
        <span className="text-xl font-bold font-mono tracking-tighter text-primary">Stock</span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav />
      </div>
      <div className="border-t p-4 flex items-center justify-between">
        <ThemeToggle />
        {session?.user && (
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
        )}
      </div>
    </div>
  );
}
