"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "./avatar";
import { BrandLogo, BrandSymbol } from "./brand-logo";
import { SignOutButton } from "./sign-out-button";

export function Nav({
  title,
  userLabel,
  links,
}: {
  title: string;
  userLabel: string;
  links: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3" title={title}>
          <BrandSymbol className="h-9 w-9 sm:hidden" />
          <BrandLogo className="hidden h-9 sm:block" />
          <span className="hidden border-l border-slate-200 pl-3 text-xs font-medium text-slate-400 lg:block">
            Panelist portal
          </span>
        </div>

        <nav className="flex gap-1 rounded-full bg-slate-100 p-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <Avatar name={userLabel} />
          <span className="hidden text-sm font-medium text-slate-700 md:block">
            {userLabel}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
