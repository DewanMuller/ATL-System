"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Target,
  Goal,
  BookOpen,
  Crosshair,
  Trophy,
  ListTodo,
  GanttChartSquare,
  Table2,
  CalendarCheck,
  ClipboardCheck,
  CalendarDays,
  CalendarRange,
  AlertTriangle,
  Boxes,
  Shield,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/actions/auth";

const NAV_GROUPS = [
  {
    label: "Home",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/my-work", label: "My Work", icon: User },
    ],
  },
  {
    label: "Strategy",
    links: [
      { href: "/bhag", label: "BHAG", icon: Target },
      { href: "/okrs", label: "OKRs", icon: Goal },
      { href: "/okr-register", label: "OKR Register", icon: BookOpen },
      { href: "/focus-planning", label: "Focus Planning", icon: Crosshair },
      { href: "/timeline", label: "Timeline", icon: GanttChartSquare },
      { href: "/raci", label: "RACI Matrix", icon: Table2 },
      { href: "/due-date-approvals", label: "Due Date Approvals", icon: CalendarCheck },
    ],
  },
  {
    label: "Execution",
    links: [
      { href: "/winning-moves", label: "Winning Moves", icon: Trophy },
      { href: "/next-steps", label: "Next Steps", icon: ListTodo },
    ],
  },
  {
    label: "Reviews",
    links: [
      { href: "/wrap", label: "Weekly Check-ins", icon: ClipboardCheck },
      { href: "/mrap", label: "Monthly Review", icon: CalendarDays },
      { href: "/qrap", label: "Quarterly Review", icon: CalendarRange },
    ],
  },
  {
    label: "Issues",
    links: [{ href: "/issues", label: "Issues (DIBR)", icon: AlertTriangle }],
  },
  {
    label: "Suite",
    links: [{ href: "/suite", label: "The BGC System", icon: Boxes }],
  },
] as const;

export function Sidebar({
  businessName,
  userLabel,
  roleLabel,
  isSuperAdmin,
}: {
  businessName: string;
  userLabel: string;
  roleLabel: string;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col bg-zinc-950 text-zinc-300">
      <div className="flex flex-col items-start gap-3 border-b border-white/10 px-5 py-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- small static logo, no next/image config needed */}
        <img src="/logo-mark.png" alt="Above The Line" className="h-7 w-auto" />
        <div>
          <p className="text-sm font-semibold text-white">{businessName}</p>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Management System
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.links.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-white/10 font-medium text-white"
                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.75} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {isSuperAdmin && (
          <div className="mb-5">
            <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Platform
            </p>
            <div className="flex flex-col gap-0.5">
              <Link
                href="/admin"
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                  pathname === "/admin"
                    ? "bg-white/10 font-medium text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Shield size={16} strokeWidth={1.75} />
                Admin
              </Link>
            </div>
          </div>
        )}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {userLabel}
          </p>
          <p className="truncate text-[11px] text-zinc-500">{roleLabel}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Sign out"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </aside>
  );
}
