"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/components/component.utils";
import { useSession } from "@/lib/auth-client";
import { UserMenu } from "@/components/layout/UserMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { BrandMark, FOOTER_ITEMS, NavLink, SidebarNav } from "@/components/layout/SidebarNav";

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
          <UserMenu>
            <button
              type="button"
              title={collapsed ? session.user.name || "User" : undefined}
              className={cn(
                "flex w-full items-center rounded-md text-left transition-colors hover:bg-[color:var(--surface-2)]",
                collapsed ? "justify-center p-1.5" : "gap-3 px-2 py-2",
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                {session.user.image ? (
                  <AvatarImage src={session.user.image} alt={session.user.name || "Avatar"} />
                ) : null}
                <AvatarFallback className="text-xs font-semibold text-white [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))]">
                  {session.user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
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
          </UserMenu>
        </div>
      )}
    </aside>
  );
}
