import {
  LayoutDashboard,
  Package,
  MapPin,
  FolderTree,
  Tag,
  Wrench,
  Bell,
  ClipboardList,
  Settings,
  type LucideIcon,
} from "lucide-react";

export const APP_NAME = "Inventory";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Shopping List/Needs", href: "/needs", icon: ClipboardList },
  { label: "Inventory", href: "/items", icon: Package },
  { label: "Categories", href: "/categories", icon: FolderTree },
  { label: "Storage", href: "/locations", icon: MapPin },
  { label: "Labels", href: "/tags", icon: Tag },
  { label: "Maintenance", href: "/maintenance", icon: Wrench },
  { label: "Reminders", href: "/reminders", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export const CURRENCY_OPTIONS = [
  { value: "EUR", label: "EUR — Euro" },
  { value: "USD", label: "USD — US Dollar" },
] as const;

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]["value"];

export const TIMEZONE_OPTIONS = [
  { value: "Pacific/Honolulu", label: "(UTC-10) Hawaii" },
  { value: "America/Anchorage", label: "(UTC-9) Alaska" },
  { value: "America/Los_Angeles", label: "(UTC-8) Pacific" },
  { value: "America/Denver", label: "(UTC-7) Mountain" },
  { value: "America/Chicago", label: "(UTC-6) Central" },
  { value: "America/New_York", label: "(UTC-5) Eastern" },
  { value: "America/Sao_Paulo", label: "(UTC-3) São Paulo" },
  { value: "Atlantic/Reykjavik", label: "(UTC+0) Reykjavik" },
  { value: "Europe/London", label: "(UTC+0) London" },
  { value: "Europe/Paris", label: "(UTC+1) Paris" },
  { value: "Europe/Berlin", label: "(UTC+1) Berlin" },
  { value: "Europe/Madrid", label: "(UTC+1) Madrid" },
  { value: "Europe/Rome", label: "(UTC+1) Rome" },
  { value: "Europe/Warsaw", label: "(UTC+1) Warsaw" },
  { value: "Europe/Zurich", label: "(UTC+1) Zurich" },
  { value: "Europe/Athens", label: "(UTC+2) Athens" },
  { value: "Europe/Bucharest", label: "(UTC+2) Bucharest" },
  { value: "Europe/Helsinki", label: "(UTC+2) Helsinki" },
  { value: "Europe/Kyiv", label: "(UTC+2) Kyiv" },
  { value: "Europe/Vilnius", label: "(UTC+2) Vilnius" },
  { value: "Europe/Moscow", label: "(UTC+3) Moscow" },
  { value: "Asia/Dubai", label: "(UTC+4) Dubai" },
  { value: "Asia/Kolkata", label: "(UTC+5:30) India" },
  { value: "Asia/Shanghai", label: "(UTC+8) Shanghai" },
  { value: "Asia/Tokyo", label: "(UTC+9) Tokyo" },
  { value: "Australia/Sydney", label: "(UTC+11) Sydney" },
  { value: "Pacific/Auckland", label: "(UTC+12) Auckland" },
] as const;
