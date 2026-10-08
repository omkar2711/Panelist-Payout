import type { ReactNode } from "react";
import { Banknote, CalendarCheck, ListChecks } from "lucide-react";
import { BrandLogo } from "./brand-logo";

const HIGHLIGHTS = [
  {
    icon: CalendarCheck,
    title: "Log interviews in seconds",
    text: "Date, start time and slot — that's all it takes.",
  },
  {
    icon: ListChecks,
    title: "See where every interview stands",
    text: "Submitted, approved and paid, always up to date.",
  },
  {
    icon: Banknote,
    title: "Know exactly what's owed",
    text: "Earnings and payouts in one place, with no spreadsheets.",
  },
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-indigo-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-[28rem] w-[28rem] rounded-full bg-white/5" />

        <div className="relative">
          <BrandLogo variant="white" className="h-14" />
        </div>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Interviews logged.
            <br />
            Payouts sorted.
          </h2>
          <p className="mt-4 text-base text-blue-100">
            One place for panelists and the vendor to track interviews, approvals and
            payments.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title: heading, text }) => (
              <li key={heading} className="flex gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{heading}</span>
                  <span className="block text-sm text-blue-100">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-blue-200">
          Access is by invitation from the vendor.
        </p>
      </aside>

      <main className="flex items-center justify-center bg-slate-50 px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <BrandLogo variant="tagline" className="h-12" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
