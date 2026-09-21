"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  User,
  Target,
  BookOpen,
  ListTodo,
  ListChecks,
  Crosshair,
  Table2,
  CalendarCheck,
  FileText,
  FileCheck,
  Layers,
  Building2,
  TrendingUp,
  GanttChartSquare,
  Trophy,
  AlertTriangle,
  LogOut,
  ShieldCheck,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Home",
    links: [
      { href: "/preview/dashboard", label: "Dashboard", icon: LayoutGrid },
      { href: "/preview/my-work", label: "My Work", icon: User },
    ],
  },
  {
    label: "Strategy",
    links: [
      { href: "/preview/bhag", label: "BHAG", icon: Target },
      { href: "/preview/timeline", label: "Timeline", icon: GanttChartSquare },
    ],
  },
  {
    label: "OKRs",
    links: [
      { href: "/preview/okr-workspace", label: "OKR Workspace", icon: LayoutGrid },
      { href: "/preview/okr-register", label: "OKR Register", icon: BookOpen },
      { href: "/preview/all-initiatives", label: "All Initiatives", icon: ListChecks },
      { href: "/preview/focus-planning", label: "Focus Planning", icon: Crosshair },
      { href: "/preview/raci-matrix", label: "RACI Matrix", icon: Table2 },
      { href: "/preview/due-date-approvals", label: "Due Date Approvals", icon: CalendarCheck },
    ],
  },
  {
    label: "Execution",
    links: [
      { href: "/preview/winning-moves", label: "Winning Moves", icon: Trophy },
      { href: "/preview/next-steps", label: "Next Steps", icon: ListTodo },
      { href: "/preview/issues", label: "Issues", icon: AlertTriangle },
    ],
  },
  {
    label: "Monthly Reporting",
    links: [
      { href: "/preview/submit-mrap", label: "Submit MRAP", icon: FileText },
      { href: "/preview/mrap-review", label: "MRAP Review", icon: FileCheck },
      { href: "/preview/pillar-mrap", label: "Pillar MRAP", icon: Layers },
      { href: "/preview/pillar-mrap-review", label: "Pillar MRAP Review", icon: Layers },
      { href: "/preview/company-mrap", label: "Company MRAP", icon: Building2 },
    ],
  },
  {
    label: "Reports",
    links: [
      {
        href: "/preview/rolling-performance-report",
        label: "Rolling Performance Report",
        icon: TrendingUp,
      },
    ],
  },
] as const;

export function PreviewSidebar({
  userLabel,
  roleLabel,
  isSuperAdmin,
}: {
  userLabel: string;
  roleLabel: string;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col bg-zinc-950 text-zinc-300">
      <div className="flex flex-col items-start gap-0.5 border-b border-white/10 px-5 py-6">
        <p className="text-base font-semibold text-white">Above The Line</p>
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">
          Management System
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {isSuperAdmin && (
          <div className="mb-5">
            <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Super Admin
            </p>
            <div className="flex flex-col gap-0.5">
              <Link
                href="/preview/admin"
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                  pathname === "/preview/admin"
                    ? "bg-emerald-600 font-medium text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <ShieldCheck size={16} strokeWidth={1.75} />
                Admin
              </Link>
            </div>
          </div>
        )}
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
                        ? "bg-emerald-600 font-medium text-white"
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
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{userLabel}</p>
          <p className="truncate text-[11px] text-zinc-500">{roleLabel}</p>
        </div>
        <Link
          href="/dashboard"
          aria-label="Back to the live app"
          title="Back to the live app"
          className="rounded-md p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={16} strokeWidth={1.75} />
        </Link>
      </div>
    </aside>
  );
}
