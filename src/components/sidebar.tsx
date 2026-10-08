"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  FileText,
  LayoutDashboard,
  Users,
  Wallet,
  Wallet2,
} from "lucide-react";
import { SignOutButton } from "./sign-out-button";

const NAV_ICONS = {
  dashboard: LayoutDashboard,
  approvals: CheckSquare,
  panelists: Users,
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

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white print:hidden">
      <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Wallet2 className="h-4.5 w-4.5" strokeWidth={2.25} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Panelist Payout</p>
          <p className="text-xs text-slate-400">Vendor console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const Icon = NAV_ICONS[link.icon];
          const isActive =
            link.href === "/vendor"
              ? pathname === "/vendor"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4" strokeWidth={2} />
                {link.label}
              </span>
              {link.icon === "approvals" && pendingCount ? (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                  {pendingCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
            {userLabel.slice(0, 1).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-slate-600">{userLabel}</span>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
