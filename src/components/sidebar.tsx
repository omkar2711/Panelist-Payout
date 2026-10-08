"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar } from "./avatar";
import { BrandLogo } from "./brand-logo";
import { SignOutButton } from "./sign-out-button";

const NAV_ICONS = {
  dashboard: LayoutDashboard,
  approvals: CheckSquare,
  interviews: ClipboardList,
  panelists: Users,
  leaderboard: Trophy,
  payments: Wallet,
  invoice: FileText,
} as const;

export function Sidebar({
  links,
  userLabel,
  pendingCount,
}: {
  links: { href: string; label: string; icon: keyof typeof NAV_ICONS }[];
  userLabel: string;
  pendingCount?: number;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/vendor" ? pathname === "/vendor" : pathname.startsWith(href);
  const badge = (icon: string) =>
    icon === "approvals" && pendingCount ? (
      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-amber-800">
        {pendingCount}
      </span>
    ) : null;

  return (
    <>
      {/* Small screens: a top bar with a scrollable row of links */}
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/85 backdrop-blur lg:hidden print:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <BrandLogo className="h-8" />
          <div className="flex items-center gap-1.5">
            <Avatar name={userLabel} />
            <SignOutButton />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {link.label}
              {badge(link.icon)}
            </Link>
          ))}
        </nav>
      </header>

      {/* Large screens: a fixed-height sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white lg:flex print:hidden">
        <div className="px-5 pb-3 pt-5">
          <BrandLogo className="h-10" />
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Vendor console
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {links.map((link) => {
            const Icon = NAV_ICONS[link.icon];
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4.5 w-4.5 ${active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}
                    strokeWidth={2}
                  />
                  {link.label}
                </span>
                {badge(link.icon)}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={userLabel} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{userLabel}</p>
              <p className="text-xs text-slate-400">Vendor</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
