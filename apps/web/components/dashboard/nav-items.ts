import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  Layers,
  Map,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plan", label: "Plan", icon: Map },
  { href: "/library", label: "Бібліотека", icon: BookOpen },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/vocabulary", label: "Vocabulary", icon: Layers },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
] as const;

export function isActiveNav(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
