"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowRightLeft, PieChart, Briefcase, Eye, Settings, LineChart } from "lucide-react";
import { cn } from "@/components/component.utils";

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
  return (
    <div className="hidden md:flex w-64 flex-col border-r bg-card h-full">
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav />
      </div>
    </div>
  );
}
