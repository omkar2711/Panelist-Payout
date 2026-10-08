"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { EarningsChart } from "@/components/earnings-chart";
import { formatCurrency } from "@/lib/format";
import {
  buildPeriods,
  dayMonth,
  monthYear,
  parseLocalDate,
  startOfToday,
  type Granularity,
} from "@/lib/periods";

export type EarningPoint = { date: string; amount: number };

const STORAGE_KEY = "panelist-payout:earnings-view";
const OPTIONS: { id: Granularity; label: string; range: string }[] = [
  { id: "day", label: "Day", range: "last 14 days" },
  { id: "week", label: "Week", range: "last 8 weeks" },
  { id: "month", label: "Month", range: "last 6 months" },
];

function loadGranularity(): Granularity {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "day" || saved === "week" || saved === "month") return saved;
  } catch {
    // Storage unavailable — fall through to the default.
  }
  return "month";
}

export function EarningsExplorer({ points }: { points: EarningPoint[] }) {
  const [granularity, setGranularity] = useState<Granularity>(loadGranularity);
  const [today] = useState(startOfToday);

  const { data, span } = useMemo(() => {
    const buckets = buildPeriods(granularity, today).map((bucket) => ({
      ...bucket,
      amount: 0,
    }));
    for (const point of points) {
      const date = parseLocalDate(point.date);
      const bucket = buckets.find((b) => date >= b.start && date <= b.end);
      if (bucket) bucket.amount += point.amount;
    }
    const first = buckets[0].start;
    const last = buckets[buckets.length - 1].end;
    return {
      data: buckets.map(({ label, tooltip, amount }) => ({ label, tooltip, amount })),
      span:
        granularity === "month"
          ? `${monthYear(first)} – ${monthYear(last)}`
          : `${dayMonth(first)} – ${dayMonth(last)}`,
    };
  }, [points, granularity, today]);

  const option = OPTIONS.find((o) => o.id === granularity)!;
  const total = data.reduce((sum, bucket) => sum + bucket.amount, 0);

  function choose(next: Granularity) {
    setGranularity(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not being able to remember the choice is fine.
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Earnings by {granularity}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Approved and paid interviews · {option.range} ({span})
            {total > 0 ? (
              <>
                {" · "}
                <span className="font-medium tabular-nums text-slate-600">
                  {formatCurrency(total)}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div
          role="group"
          aria-label="Group earnings by"
          className="inline-flex rounded-full bg-slate-100 p-1"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={o.id === granularity}
              onClick={() => choose(o.id)}
              className={`rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
                o.id === granularity
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {total > 0 ? (
        <EarningsChart
          data={data}
          seriesName="Earnings"
          xInterval={granularity === "month" ? 0 : "preserveStartEnd"}
        />
      ) : (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-slate-50 px-6 text-center">
          <BarChart3 className="h-6 w-6 text-slate-300" />
          <p className="mt-2 text-sm text-slate-400">
            {points.length === 0
              ? "Your earnings will show here once an interview is approved."
              : `No approved earnings in the ${option.range}.`}
          </p>
        </div>
      )}
    </div>
  );
}
