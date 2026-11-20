"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Download, Printer, Search } from "lucide-react";
import { cardClass } from "@/components/stat-tile";
import { formatDate, formatExact } from "@/lib/format";

export type StatementRow = {
  id: string;
  date: string;
  direction: "in" | "out";
  party: string;
  description: string;
  details: string;
  mode: string | null;
  reference: string | null;
  notes: string | null;
  amount: number;
  balance: number;
};

const selectClass =
  "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const cell = "px-4 py-3 first:pl-6 last:pr-6";

// The financial year to show, kept in the page address (?fy=2026 or ?fy=all).
export function YearPicker({
  years,
  value,
}: {
  years: { key: string; label: string }[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm print:hidden">
      <CalendarDays className="h-4 w-4 text-slate-400" />
      <span className="sr-only">Financial year</span>
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(() => router.push(`${pathname}?fy=${next}`, { scroll: false }));
        }}
        className={`bg-transparent font-medium text-slate-800 focus:outline-none ${pending ? "opacity-50" : ""}`}
      >
        {years.map((year) => (
          <option key={year.key} value={year.key}>
            {year.label}
          </option>
        ))}
        <option value="all">All time</option>
      </select>
    </label>
  );
}

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function StatementTable({
  rows,
  opening,
  closing,
  title,
  fileName,
}: {
  rows: StatementRow[];
  opening: number;
  closing: number;
  title: string;
  fileName: string;
}) {
  const [direction, setDirection] = useState<"" | "in" | "out">("");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const words = query.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (!direction || row.direction === direction) &&
        (!words ||
          `${row.party} ${row.description} ${row.details} ${row.mode ?? ""} ${row.reference ?? ""} ${row.notes ?? ""}`
            .toLowerCase()
            .includes(words)),
    );
  }, [rows, direction, query]);

  function download() {
    const header = ["Date", "Type", "Party", "Description", "Details", "Mode", "Reference", "Notes", "Money in", "Money out", "Balance"];
    const lines = [
      header,
      ["", "", "", "Opening balance", "", "", "", "", "", "", opening.toFixed(2)],
      ...shown.map((row) => [
        row.date,
        row.direction === "in" ? "Money in" : "Money out",
        row.party,
        row.description,
        row.details,
        row.mode,
        row.reference,
        row.notes,
        row.direction === "in" ? row.amount.toFixed(2) : "",
        row.direction === "out" ? row.amount.toFixed(2) : "",
        row.balance.toFixed(2),
      ]),
      ["", "", "", "Closing balance", "", "", "", "", "", "", closing.toFixed(2)],
    ];
    const csv = lines.map((line) => line.map(csvCell).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <section className={`${cardClass} print:border-0 print:shadow-none`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={download}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> Download CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" /> Print / PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-3 print:hidden">
        <label className="relative min-w-48 flex-1">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search panelist, reference or notes"
            className={`${selectClass} w-full pl-8`}
          />
        </label>
        <select
          aria-label="Money in or out"
          value={direction}
          onChange={(e) => setDirection(e.target.value as "" | "in" | "out")}
          className={selectClass}
        >
          <option value="">Money in and out</option>
          <option value="in">Money in only</option>
          <option value="out">Money out only</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className={cell}>Date</th>
              <th className={cell}>Description</th>
              <th className={cell}>Mode / reference</th>
              <th className={`${cell} text-right`}>Money out</th>
              <th className={`${cell} text-right`}>Money in</th>
              <th className={`${cell} text-right`}>Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100 bg-slate-50/40 text-slate-500">
              <td className={cell} />
              <td className={`${cell} font-medium`}>Opening balance</td>
              <td className={cell} />
              <td className={cell} />
              <td className={cell} />
              <td className={`${cell} text-right font-medium tabular-nums`}>{formatExact(opening)}</td>
            </tr>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  Nothing in this period.
                </td>
              </tr>
            ) : (
              shown.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 align-top">
                  <td className={`${cell} whitespace-nowrap text-slate-600`}>{formatDate(row.date)}</td>
                  <td className={cell}>
                    <div className="flex items-start gap-2">
                      {row.direction === "in" ? (
                        <ArrowDownLeft className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 print:hidden" />
                      ) : (
                        <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 print:hidden" />
                      )}
                      <div>
                        <p className="font-medium text-slate-800">{row.description}</p>
                        {row.details ? <p className="mt-0.5 text-xs text-slate-500">{row.details}</p> : null}
                        {row.notes ? <p className="mt-0.5 text-xs italic text-slate-400">{row.notes}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className={`${cell} text-slate-500`}>
                    {[row.mode, row.reference].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className={`${cell} whitespace-nowrap text-right tabular-nums text-slate-800`}>
                    {row.direction === "out" ? formatExact(row.amount) : ""}
                  </td>
                  <td className={`${cell} whitespace-nowrap text-right tabular-nums text-emerald-700`}>
                    {row.direction === "in" ? formatExact(row.amount) : ""}
                  </td>
                  <td className={`${cell} whitespace-nowrap text-right font-medium tabular-nums text-slate-900`}>
                    {formatExact(row.balance)}
                  </td>
                </tr>
              ))
            )}
            <tr className="border-t border-slate-200 bg-slate-50/40 text-slate-700">
              <td className={cell} />
              <td className={`${cell} font-semibold`}>Closing balance</td>
              <td className={cell} />
              <td className={cell} />
              <td className={cell} />
              <td className={`${cell} text-right font-semibold tabular-nums`}>{formatExact(closing)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
