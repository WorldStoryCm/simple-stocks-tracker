"use client";

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
  { name: "Help & Support", href: "/help", icon: HelpCircle },
];

function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors hover:bg-[color:var(--surface-2)]"
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
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-150",
        active
          ? "bg-[color:var(--surface-2)] text-text-primary font-medium"
          : "text-text-secondary hover:bg-[color:var(--surface-2)]/60 hover:text-text-primary",
      )}
    >
      {active && (
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
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (pathname.startsWith(href) && href !== "/");

  return (
    <nav className="flex flex-col gap-5 px-3">
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-1">
          {group.label && (
            <div className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              {group.label}
            </div>
          )}
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
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
  const isActive = (href: string) =>
    pathname === href || (pathname.startsWith(href) && href !== "/");

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-[color:var(--sidebar-border)] bg-[color:var(--sidebar-bg)] h-full">
      <div className="flex items-center justify-between px-3 pt-4 pb-3">
        <BrandMark />
        <button
          type="button"
          aria-label="Collapse sidebar"
          className="hidden lg:inline-flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-[color:var(--surface-2)] transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pt-1 pb-4">
        <SidebarNav />
      </div>

      <div className="px-3 pb-3 pt-2 border-t border-[color:var(--sidebar-border)] flex flex-col gap-1">
        {FOOTER_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </div>

      {session?.user && (
        <div className="border-t border-[color:var(--sidebar-border)] p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-[color:var(--surface-2)]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))] text-xs font-semibold text-white">
                  {session.user.name?.charAt(0).toUpperCase() || "U"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">
                    {session.user.name || "User"}
                  </span>
                  <span className="block truncate text-[11px] text-text-tertiary">
                    Pro Plan
                  </span>
                </span>
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
