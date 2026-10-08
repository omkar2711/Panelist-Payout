import type { ComponentType, ReactNode } from "react";

export const cardClass = "rounded-2xl border border-slate-200/80 bg-white shadow-sm";

export function FeatureTile({
  label,
  value,
  hint,
  children,
  className = "",
}: {
  label: string;
  value: string;
  hint: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg shadow-blue-600/20 ${className}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-16 right-16 h-36 w-36 rounded-full bg-white/5" />
      <p className="text-sm font-medium text-blue-100">{label}</p>
      <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-blue-100">{hint}</p>
      {children ? <div className="relative mt-4">{children}</div> : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  className = "",
}: {
  label: string;
  value: string;
  hint: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: string;
  className?: string;
}) {
  return (
    <div className={`${cardClass} p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-4.5 w-4.5" strokeWidth={2.25} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}
