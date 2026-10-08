import type { ComponentType } from "react";

const ACCENTS = {
  neutral: "bg-slate-100 text-slate-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
} as const;

export function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  accent?: keyof typeof ACCENTS;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon ? (
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${ACCENTS[accent]}`}
          >
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
