"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowRightLeft,
  PieChart,
  Briefcase,
  Settings,
  LineChart,
  FlaskConical,
  Tags,
  Sparkles,
  Banknote,
  Newspaper,
  ChartNoAxesCombined,
} from "lucide-react";
import { cn } from "@/components/component.utils";

export type NavItem = {
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
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Trades", href: "/trades", icon: ArrowRightLeft },
      { name: "Trading Sessions", href: "/trading-sessions", icon: ChartNoAxesCombined },
      { name: "Dividends", href: "/dividends", icon: Banknote },
      { name: "News", href: "/news", icon: Newspaper },
      { name: "Positions", href: "/positions", icon: PieChart },
      { name: "Performance", href: "/performance", icon: LineChart },
    ],
  },
  {
    label: "Trade Universe",
    items: [
      { name: "Platforms", href: "/platforms", icon: Briefcase },
      { name: "Symbols", href: "/symbols", icon: Tags },
      { name: "Shadow Trading", href: "/shadow", icon: FlaskConical },
    ],
  },
];

export const FOOTER_ITEMS: NavItem[] = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
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

export function NavLink({
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
