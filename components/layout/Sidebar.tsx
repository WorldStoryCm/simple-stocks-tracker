"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowRightLeft,
  PieChart,
  Briefcase,
  Eye,
  Settings,
  LineChart,
  FlaskConical,
  Tags,
  HelpCircle,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/components/component.utils";
import { useSession, signOut } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/dropdown-menu";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Trades", href: "/trades", icon: ArrowRightLeft },
      { name: "Positions", href: "/positions", icon: PieChart },
      { name: "Performance", href: "/performance", icon: LineChart },
    ],
  },
  {
    label: "Trade Universe",
    items: [
      { name: "Platforms", href: "/platforms", icon: Briefcase },
      { name: "Symbols", href: "/symbols", icon: Tags },
      { name: "Watchlist", href: "/watchlist", icon: Eye },
      { name: "Shadow Trading", href: "/shadow", icon: FlaskConical },
    ],
  },
];

const FOOTER_ITEMS: NavItem[] = [
  { name: "Settings", href: "/settings", icon: Settings },
  // { name: "Help & Support", href: "/help", icon: HelpCircle },
];

function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 rounded-md transition-colors hover:bg-[color:var(--surface-2)]",
        collapsed ? "justify-center px-1.5 py-1.5" : "px-2 py-1.5",
      )}
      title={collapsed ? "Stock Tracker" : undefined}
    >
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))] shadow-[var(--shadow-glow-brand)]">
        <Sparkles className="h-4 w-4 text-white" strokeWidth={2.4} />
      </span>
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold tracking-tight text-text-primary">
            Stock Tracker
          </span>
        </div>
      )}
    </Link>
  );
}

function NavLink({
  item,
  active,
  collapsed = false,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.name : undefined}
      aria-label={collapsed ? item.name : undefined}
      className={cn(
        "group relative flex items-center rounded-md text-sm transition-all duration-150",
        collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2",
        active
          ? "bg-[color:var(--surface-2)] text-text-primary font-medium"
          : "text-text-secondary hover:bg-[color:var(--surface-2)]/60 hover:text-text-primary",
      )}
    >
      {active && !collapsed && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full [background-image:linear-gradient(180deg,var(--brand-from),var(--brand-to))]"
        />
      )}
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-text-primary" : "text-text-tertiary group-hover:text-text-primary",
        )}
      />
      {!collapsed && <span className="truncate">{item.name}</span>}
    </Link>
  );
}

export function SidebarNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (pathname.startsWith(href) && href !== "/");

  return (
    <nav className={cn("flex flex-col gap-5", collapsed ? "px-1.5" : "px-3")}>
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-1">
          {group.label && !collapsed && (
            <div className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              {group.label}
            </div>
          )}
          {group.label && collapsed && gi > 0 && (
            <div className="mx-auto h-px w-6 bg-[color:var(--sidebar-border)]" />
          )}
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isActive = (href: string) =>
    pathname === href || (pathname.startsWith(href) && href !== "/");

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col border-r border-[color:var(--sidebar-border)] bg-[color:var(--sidebar-bg)] h-full transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex items-center pt-4 pb-3",
          collapsed ? "flex-col gap-2 px-1.5" : "justify-between px-3",
        )}
      >
        <BrandMark collapsed={collapsed} />
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-[color:var(--surface-2)] transition-colors"
        >
          <ChevronLeft
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pt-1 pb-4">
        <SidebarNav collapsed={collapsed} />
      </div>

      <div
        className={cn(
          "pb-3 pt-2 border-t border-[color:var(--sidebar-border)] flex flex-col gap-1",
          collapsed ? "px-1.5" : "px-3",
        )}
      >
        {FOOTER_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            collapsed={collapsed}
          />
        ))}
      </div>

      {session?.user && (
        <div
          className={cn(
            "border-t border-[color:var(--sidebar-border)]",
            collapsed ? "p-2" : "p-3",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={collapsed ? session.user.name || "User" : undefined}
                className={cn(
                  "flex w-full items-center rounded-md text-left transition-colors hover:bg-[color:var(--surface-2)]",
                  collapsed ? "justify-center p-1.5" : "gap-3 px-2 py-2",
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))] text-xs font-semibold text-white">
                  {session.user.name?.charAt(0).toUpperCase() || "U"}
                </span>
                {!collapsed && (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-primary">
                      {session.user.name || "User"}
                    </span>
                    <span className="block truncate text-[11px] text-text-tertiary">
                      Pro Plan
                    </span>
                  </span>
                )}
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
        </div>
      )}
    </aside>
  );
}
