"use client";

import { Avatar } from "@/components/avatar";
import { cardClass } from "@/components/stat-tile";
import { INTERVIEW_OUTCOMES } from "@/lib/interview-rates";
import type { OutcomeCountRow } from "@/lib/performance";

// Outcomes that cost the panelist or the client a full slot, called out in colour.
const TONE: Record<string, string> = {
  student_no_show: "text-amber-700",
  cancelled: "text-slate-700",
  interviewer_no_show: "text-red-600",
  wrong_interview: "text-red-600",
};

function percent(part: number, whole: number) {
  return whole === 0 ? "—" : `${Math.round((part / whole) * 100)}%`;
}

export function OutcomeBreakdown({
  rows,
  periodLabel,
}: {
  rows: OutcomeCountRow[];
  periodLabel: string;
}) {
  const totals = rows.reduce(
    (sum, row) => {
      sum.total += row.total;
      for (const outcome of INTERVIEW_OUTCOMES) {
        sum.counts[outcome.id] = (sum.counts[outcome.id] ?? 0) + (row.counts[outcome.id] ?? 0);
      }
      return sum;
    },
    { total: 0, counts: {} as Record<string, number> },
  );
  const cell = "px-4 py-3 text-right tabular-nums";

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Interview outcomes by panelist</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Approved interviews, by how each one turned out.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {periodLabel}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-slate-400">
          No approved interviews {periodLabel === "All time" ? "yet" : `in ${periodLabel}`}.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-6 py-2.5">Panelist</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                {INTERVIEW_OUTCOMES.map((outcome) => (
                  <th key={outcome.id} className="px-4 py-2.5 text-right">
                    {outcome.short}
                    <span className="block font-normal normal-case tracking-normal text-slate-400">
                      {outcome.payoutPercent}% pay
                    </span>
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right">Completed rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.panelistId} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={row.name} />
                      <span className="font-medium text-slate-800">{row.name}</span>
                    </div>
                  </td>
                  <td className={`${cell} font-semibold text-slate-900`}>{row.total}</td>
                  {INTERVIEW_OUTCOMES.map((outcome) => {
                    const count = row.counts[outcome.id] ?? 0;
                    return (
                      <td
                        key={outcome.id}
                        className={`${cell} ${
                          count === 0 ? "text-slate-300" : `font-medium ${TONE[outcome.id] ?? "text-slate-700"}`
                        }`}
                      >
                        {count}
                      </td>
                    );
                  })}
                  <td className={`${cell} text-slate-600`}>
                    {percent(row.counts.completed ?? 0, row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50/60 font-semibold text-slate-900">
                <td className="px-6 py-3">All panelists</td>
                <td className={cell}>{totals.total}</td>
                {INTERVIEW_OUTCOMES.map((outcome) => (
                  <td key={outcome.id} className={cell}>
                    {totals.counts[outcome.id] ?? 0}
                  </td>
                ))}
                <td className={cell}>{percent(totals.counts.completed ?? 0, totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
