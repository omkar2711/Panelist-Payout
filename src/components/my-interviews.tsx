"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Search, X } from "lucide-react";
import { revokeEntry } from "@/app/panelist/actions";
import { OutcomeLabel } from "@/components/outcome-label";
import { cardClass } from "@/components/stat-tile";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import { INTERVIEW_OUTCOMES } from "@/lib/interview-rates";
import { monthLabel } from "@/lib/performance";
import type { EntryStatus, InterviewEntry } from "@/lib/types";

const PAGE_SIZE = 10;

const APPROVALS: { id: EntryStatus; label: string }[] = [
  { id: "submitted", label: "Submitted" },
  { id: "approved", label: "Approved" },
  { id: "paid", label: "Paid" },
  { id: "rejected", label: "Rejected" },
];

const SORTS = {
  newest: "Newest first",
  oldest: "Oldest first",
  amountHigh: "Amount: high to low",
  amountLow: "Amount: low to high",
} as const;
type SortId = keyof typeof SORTS;

const when = (e: InterviewEntry) => `${e.interview_date} ${e.start_time ?? ""}`;

const selectClass =
  "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const cell = "px-4 py-3 first:pl-6 last:pr-6";

export function MyInterviews({ entries }: { entries: InterviewEntry[] }) {
  const [query, setQuery] = useState("");
  const [approval, setApproval] = useState<"" | EntryStatus>("");
  const [outcome, setOutcome] = useState("");
  const [month, setMonth] = useState("");
  const [sort, setSort] = useState<SortId>("newest");
  const [page, setPage] = useState(1);

  const months = useMemo(
    () => [...new Set(entries.map((e) => e.interview_date.slice(0, 7)))].sort().reverse(),
    [entries],
  );

  const shown = useMemo(() => {
    const words = query.trim().toLowerCase();
    const rows = entries.filter(
      (e) =>
        (!approval || e.status === approval) &&
        (!outcome || e.outcome === outcome) &&
        (!month || e.interview_date.startsWith(month)) &&
        (!words ||
          `${e.candidate_ref ?? ""} ${e.interview_type ?? ""} ${e.notes ?? ""}`
            .toLowerCase()
            .includes(words)),
    );
    const amount = (e: InterviewEntry) => e.amount ?? -1;
    return rows.sort((a, b) => {
      if (sort === "oldest") return when(a).localeCompare(when(b));
      if (sort === "amountHigh") return amount(b) - amount(a) || when(b).localeCompare(when(a));
      if (sort === "amountLow") return amount(a) - amount(b) || when(b).localeCompare(when(a));
      return when(b).localeCompare(when(a));
    });
  }, [entries, query, approval, outcome, month, sort]);

  const filtering = Boolean(query.trim() || approval || outcome || month);
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstRow = (currentPage - 1) * PAGE_SIZE;
  const pageRows = shown.slice(firstRow, firstRow + PAGE_SIZE);
  const shownTotal = shown.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  // Any change to the filters starts again from the first page.
  const update =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };
  const clear = () => {
    setQuery("");
    setApproval("");
    setOutcome("");
    setMonth("");
    setPage(1);
  };

  return (
    <section className={cardClass}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-900">My interviews</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {filtering ? `${shown.length} of ${entries.length}` : `${entries.length} total`}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <ClipboardList className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-2 text-sm text-slate-400">
            No interviews logged yet. Add your first one from the form.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-3">
            <label className="relative min-w-48 flex-1">
              <span className="sr-only">Search</span>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => update(setQuery)(e.target.value)}
                placeholder="Search candidate or type"
                className={`${selectClass} w-full pl-8`}
              />
            </label>
            <select
              aria-label="Approval"
              value={approval}
              onChange={(e) => update(setApproval)(e.target.value as "" | EntryStatus)}
              className={selectClass}
            >
              <option value="">All approvals</option>
              {APPROVALS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Interview status"
              value={outcome}
              onChange={(e) => update(setOutcome)(e.target.value)}
              className={selectClass}
            >
              <option value="">All interview statuses</option>
              {INTERVIEW_OUTCOMES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.short}
                </option>
              ))}
            </select>
            <select
              aria-label="Month"
              value={month}
              onChange={(e) => update(setMonth)(e.target.value)}
              className={selectClass}
            >
              <option value="">All months</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort"
              value={sort}
              onChange={(e) => update(setSort)(e.target.value as SortId)}
              className={selectClass}
            >
              {Object.entries(SORTS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            {filtering ? (
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            ) : null}
          </div>

          {shown.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-400">
              No interviews match these filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className={`${cell} py-2.5`}>Date</th>
                    <th className={`${cell} py-2.5`}>Type</th>
                    <th className={`${cell} py-2.5`}>Candidate</th>
                    <th className={`${cell} py-2.5`}>Scheduled</th>
                    <th className={`${cell} py-2.5`}>Interview status</th>
                    <th className={`${cell} py-2.5`}>Approval</th>
                    <th className={`${cell} py-2.5 text-right`}>Amount</th>
                    <th className={`${cell} py-2.5`}></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                    >
                      <td className={`${cell} whitespace-nowrap font-medium text-slate-800`}>
                        <span className="block">{formatDate(entry.interview_date)}</span>
                        {formatTime(entry.start_time) ? (
                          <span className="block text-xs font-normal text-slate-400">
                            {formatTime(entry.start_time)}
                          </span>
                        ) : null}
                      </td>
                      <td className={cell}>{entry.interview_type ?? "—"}</td>
                      <td className={`${cell} whitespace-nowrap text-slate-500`}>
                        {entry.candidate_ref ?? "—"}
                      </td>
                      <td className={`${cell} whitespace-nowrap tabular-nums text-slate-500`}>
                        {entry.duration_minutes ? `${entry.duration_minutes} min` : "—"}
                      </td>
                      <td className={`${cell} text-slate-600`}>
                        <OutcomeLabel outcome={entry.outcome} />
                      </td>
                      <td className={cell}>
                        <StatusBadge status={entry.status} />
                      </td>
                      <td className={`${cell} whitespace-nowrap text-right font-medium tabular-nums text-slate-900`}>
                        {entry.amount === null ? "—" : formatCurrency(entry.amount)}
                      </td>
                      <td className={`${cell} text-right`}>
                        {entry.status === "submitted" ? (
                          <form action={revokeEntry.bind(null, entry.id)}>
                            <button
                              type="submit"
                              className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Revoke
                            </button>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {shown.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-3 text-sm">
              <p className="text-slate-500">
                Showing {firstRow + 1}–{firstRow + pageRows.length} of {shown.length}
                {filtering ? (
                  <span className="text-slate-400"> · {formatCurrency(shownTotal)} in these</span>
                ) : null}
              </p>
              {pageCount > 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-1 tabular-nums text-slate-500">
                    Page {currentPage} of {pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= pageCount}
                    onClick={() => setPage(currentPage + 1)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
