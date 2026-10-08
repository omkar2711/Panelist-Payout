"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CalendarRange,
  ChevronsUpDown,
  ClipboardList,
  Flame,
  ListFilter,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { EarningsChart } from "@/components/earnings-chart";
import { OutcomeLabel } from "@/components/outcome-label";
import { StatTile, cardClass } from "@/components/stat-tile";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import { INTERVIEW_DURATIONS, INTERVIEW_OUTCOMES } from "@/lib/interview-rates";
import {
  DEFAULT_PERIODS,
  buildPeriods,
  dayMonth,
  monthYear,
  parseLocalDate,
  periodsBetween,
  startOfToday,
  type Granularity,
} from "@/lib/periods";
import type { EntryStatus } from "@/lib/types";

export type InterviewRow = {
  id: string;
  panelistId: string;
  panelistName: string;
  date: string;
  startTime: string | null;
  minutes: number | null;
  outcome: string;
  type: string | null;
  candidate: string | null;
  status: EntryStatus;
  amount: number | null;
};

type SortKey = "date" | "panelist" | "minutes" | "outcome" | "status" | "amount";
type Filters = {
  panelist: string;
  from: string;
  to: string;
  approval: string;
  outcome: string;
  minutes: string;
};

const NO_FILTERS: Filters = {
  panelist: "all",
  from: "",
  to: "",
  approval: "active",
  outcome: "all",
  minutes: "all",
};
const PAGE_SIZE = 25;
const MAX_PERIODS: Record<Granularity, number> = { day: 31, week: 26, month: 24 };
const STATUS_ORDER: EntryStatus[] = ["submitted", "approved", "paid", "rejected"];
const GRANULARITIES: { id: Granularity; label: string; noun: string }[] = [
  { id: "day", label: "Day", noun: "day" },
  { id: "week", label: "Week", noun: "week" },
  { id: "month", label: "Month", noun: "month" },
];

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function PillToggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            option.id === value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

type SortState = { key: SortKey; descending: boolean };

function SortHeader({
  column,
  sort,
  onSort,
  align = "left",
  children,
}: {
  column: SortKey;
  sort: SortState;
  onSort: (column: SortKey) => void;
  align?: "left" | "right";
  children: string;
}) {
  const active = sort.key === column;
  const Icon = !active ? ChevronsUpDown : sort.descending ? ArrowDown : ArrowUp;
  return (
    <th
      className={`px-4 py-2.5 first:pl-6 ${align === "right" ? "text-right" : ""}`}
      aria-sort={active ? (sort.descending ? "descending" : "ascending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-900 ${
          active ? "text-slate-900" : ""
        }`}
      >
        {children}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}

function compareRows(a: InterviewRow, b: InterviewRow, key: SortKey) {
  switch (key) {
    case "panelist":
      return a.panelistName.localeCompare(b.panelistName);
    case "minutes":
      return (a.minutes ?? -1) - (b.minutes ?? -1);
    case "outcome":
      return (
        INTERVIEW_OUTCOMES.findIndex((o) => o.id === a.outcome) -
        INTERVIEW_OUTCOMES.findIndex((o) => o.id === b.outcome)
      );
    case "status":
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    case "amount":
      return (a.amount ?? -1) - (b.amount ?? -1);
    default:
      return `${a.date} ${a.startTime ?? ""}`.localeCompare(`${b.date} ${b.startTime ?? ""}`);
  }
}

export function InterviewExplorer({
  rows,
  panelists,
}: {
  rows: InterviewRow[];
  panelists: { id: string; name: string }[];
}) {
  const [view, setView] = useState<"list" | "activity">("list");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<SortState>({ key: "date", descending: true });
  const [page, setPage] = useState(1);
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [today] = useState(startOfToday);

  function setFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function sortBy(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, descending: !prev.descending }
        : { key, descending: key === "date" || key === "amount" },
    );
    setPage(1);
  }

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (filters.panelist !== "all" && row.panelistId !== filters.panelist) return false;
        if (filters.from && row.date < filters.from) return false;
        if (filters.to && row.date > filters.to) return false;
        if (filters.approval === "active" && row.status === "rejected") return false;
        if (
          filters.approval !== "active" &&
          filters.approval !== "all" &&
          row.status !== filters.approval
        ) {
          return false;
        }
        if (filters.outcome !== "all" && row.outcome !== filters.outcome) return false;
        if (filters.minutes !== "all" && String(row.minutes) !== filters.minutes) return false;
        return true;
      }),
    [rows, filters],
  );

  const sorted = useMemo(() => {
    const list = [...filtered].sort((a, b) => compareRows(a, b, sort.key));
    return sort.descending ? list.reverse() : list;
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstRow = (currentPage - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(firstRow, firstRow + PAGE_SIZE);
  const totalAmount = filtered.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);

  const activity = useMemo(() => {
    const end = filters.to ? parseLocalDate(filters.to) : today;
    let count = DEFAULT_PERIODS[granularity];
    let truncated = false;
    if (filters.from) {
      const needed = periodsBetween(granularity, parseLocalDate(filters.from), end);
      truncated = needed > MAX_PERIODS[granularity];
      count = Math.min(needed, MAX_PERIODS[granularity]);
    }
    const periods = buildPeriods(granularity, end, count);
    const totals = periods.map(() => 0);
    const byPanelist = new Map<string, { name: string; counts: number[]; total: number }>();

    for (const row of filtered) {
      const date = parseLocalDate(row.date);
      const index = periods.findIndex((p) => date >= p.start && date <= p.end);
      if (index === -1) continue;
      totals[index] += 1;
      const entry = byPanelist.get(row.panelistId) ?? {
        name: row.panelistName,
        counts: periods.map(() => 0),
        total: 0,
      };
      entry.counts[index] += 1;
      entry.total += 1;
      byPanelist.set(row.panelistId, entry);
    }

    const people = [...byPanelist.entries()]
      .map(([id, entry]) => ({ id, ...entry }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    const total = totals.reduce((sum, value) => sum + value, 0);
    const busiest = totals.indexOf(Math.max(...totals));
    const maxCell = Math.max(1, ...people.flatMap((person) => person.counts));
    const headers = periods.map((p) => (granularity === "month" ? p.label : dayMonth(p.start)));
    const span =
      granularity === "month"
        ? `${monthYear(periods[0].start)} – ${monthYear(periods[periods.length - 1].end)}`
        : `${dayMonth(periods[0].start)} – ${dayMonth(periods[periods.length - 1].end)}`;

    return { periods, totals, people, total, busiest, maxCell, headers, span, truncated };
  }, [filtered, filters.from, filters.to, granularity, today]);

  const noun = GRANULARITIES.find((g) => g.id === granularity)!.noun;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Interviews</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every interview panelists have logged, and how the workload is spread.
          </p>
        </div>
        <PillToggle
          label="View"
          value={view}
          onChange={setView}
          options={[
            { id: "list", label: "All interviews" },
            { id: "activity", label: "Activity" },
          ]}
        />
      </div>

      <section className={`${cardClass} p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ListFilter className="h-4 w-4 text-slate-400" />
            Filters
          </h2>
          {filtersActive ? (
            <button
              type="button"
              onClick={() => {
                setFilters(NO_FILTERS);
                setPage(1);
              }}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <FilterField label="Panelist">
            <select
              className={inputClass}
              value={filters.panelist}
              onChange={(e) => setFilter("panelist", e.target.value)}
            >
              <option value="all">All panelists</option>
              {panelists.map((panelist) => (
                <option key={panelist.id} value={panelist.id}>
                  {panelist.name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="From date">
            <input
              type="date"
              className={inputClass}
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => setFilter("from", e.target.value)}
            />
          </FilterField>
          <FilterField label="To date">
            <input
              type="date"
              className={inputClass}
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => setFilter("to", e.target.value)}
            />
          </FilterField>
          <FilterField label="Approval">
            <select
              className={inputClass}
              value={filters.approval}
              onChange={(e) => setFilter("approval", e.target.value)}
            >
              <option value="active">All except rejected</option>
              <option value="all">All</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </FilterField>
          <FilterField label="Interview status">
            <select
              className={inputClass}
              value={filters.outcome}
              onChange={(e) => setFilter("outcome", e.target.value)}
            >
              <option value="all">Any</option>
              {INTERVIEW_OUTCOMES.map((outcome) => (
                <option key={outcome.id} value={outcome.id}>
                  {outcome.short}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Scheduled slot">
            <select
              className={inputClass}
              value={filters.minutes}
              onChange={(e) => setFilter("minutes", e.target.value)}
            >
              <option value="all">Any</option>
              {INTERVIEW_DURATIONS.map((duration) => (
                <option key={duration.minutes} value={duration.minutes}>
                  {duration.minutes} mins
                </option>
              ))}
            </select>
          </FilterField>
        </div>
      </section>

      {view === "list" ? (
        <section className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              {plural(filtered.length, "interview")}
              {filtersActive ? " match" : " logged"}
            </h2>
            <p className="text-sm text-slate-500">
              Amount approved or paid:{" "}
              <span className="font-semibold tabular-nums text-slate-900">
                {formatCurrency(totalAmount)}
              </span>
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <ClipboardList className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-2 text-sm text-slate-400">
                {rows.length === 0
                  ? "No interviews have been logged yet."
                  : "No interviews match these filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/60 text-xs font-medium text-slate-500">
                    <SortHeader column="date" sort={sort} onSort={sortBy}>
                      Date & time
                    </SortHeader>
                    <SortHeader column="panelist" sort={sort} onSort={sortBy}>
                      Panelist
                    </SortHeader>
                    <SortHeader column="minutes" sort={sort} onSort={sortBy}>
                      Scheduled
                    </SortHeader>
                    <SortHeader column="outcome" sort={sort} onSort={sortBy}>
                      Interview status
                    </SortHeader>
                    <SortHeader column="status" sort={sort} onSort={sortBy}>
                      Approval
                    </SortHeader>
                    <SortHeader column="amount" sort={sort} onSort={sortBy} align="right">
                      Amount
                    </SortHeader>
                    <th className="px-4 py-2.5 pr-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                    >
                      <td className="whitespace-nowrap px-4 py-3 pl-6">
                        <span className="block font-medium text-slate-800">
                          {formatDate(row.date)}
                        </span>
                        <span className="block text-xs text-slate-400">
                          {formatTime(row.startTime) ?? "No time logged"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.panelistName} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-slate-800">
                              {row.panelistName}
                            </span>
                            {row.type || row.candidate ? (
                              <span className="block truncate text-xs text-slate-400">
                                {[row.type, row.candidate].filter(Boolean).join(" · ")}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">
                        {row.minutes ? `${row.minutes} mins` : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <OutcomeLabel outcome={row.outcome} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                        {row.amount === null ? "—" : formatCurrency(row.amount)}
                      </td>
                      <td className="px-4 py-3 pr-6 text-right">
                        {row.status === "paid" ? (
                          <span className="text-xs text-slate-400">Locked</span>
                        ) : (
                          <Link
                            href={`/vendor/entries/${row.id}`}
                            className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pageCount > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-3 text-sm">
              <p className="text-slate-500">
                Showing {firstRow + 1}–{firstRow + pageRows.length} of {sorted.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              <CalendarRange className="mr-1.5 inline h-4 w-4 text-slate-400" />
              {activity.span}
              {activity.truncated
                ? ` · showing the most recent ${plural(activity.periods.length, noun)} of the selected range`
                : ""}
            </p>
            <PillToggle
              label="Group by"
              value={granularity}
              onChange={setGranularity}
              options={GRANULARITIES}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Interviews"
              value={String(activity.total)}
              hint={`Across ${plural(activity.periods.length, noun)}`}
              icon={ClipboardList}
              tone="bg-blue-50 text-blue-600"
            />
            <StatTile
              label="Panelists who took them"
              value={String(activity.people.length)}
              hint={
                activity.people[0]
                  ? `Most: ${activity.people[0].name} (${activity.people[0].total})`
                  : "No one in this range"
              }
              icon={Users}
              tone="bg-emerald-50 text-emerald-600"
            />
            <StatTile
              label={`Busiest ${noun}`}
              value={activity.total ? String(activity.totals[activity.busiest]) : "0"}
              hint={activity.total ? activity.periods[activity.busiest].tooltip : "Nothing logged"}
              icon={Flame}
              tone="bg-amber-50 text-amber-600"
            />
          </div>

          <section className={`${cardClass} p-6`}>
            <h2 className="text-sm font-semibold text-slate-900">Interviews per {noun}</h2>
            <p className="mb-4 mt-1 text-xs text-slate-400">
              Counted on the interview date, using the filters above
            </p>
            {activity.total > 0 ? (
              <EarningsChart
                data={activity.periods.map((period, index) => ({
                  label: period.label,
                  tooltip: period.tooltip,
                  amount: activity.totals[index],
                }))}
                seriesName="Interviews"
                formatValue={(value) => String(value)}
                wholeNumbers
                xInterval={granularity === "month" ? 0 : "preserveStartEnd"}
              />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-slate-50 text-center">
                <ClipboardList className="h-6 w-6 text-slate-300" />
                <p className="mt-2 text-sm text-slate-400">No interviews in this range.</p>
              </div>
            )}
          </section>

          <section className={cardClass}>
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Who took them</h2>
              <p className="mt-1 text-xs text-slate-400">
                Interviews per panelist for each {noun}; darker cells mean more interviews
              </p>
            </div>
            {activity.people.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-400">
                No interviews in this range.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/60 text-xs font-medium text-slate-500">
                      <th className="sticky left-0 bg-slate-50 px-6 py-2.5 text-left uppercase tracking-wide">
                        Panelist
                      </th>
                      {activity.headers.map((header, index) => (
                        <th
                          key={index}
                          title={activity.periods[index].tooltip}
                          className="whitespace-nowrap px-2 py-2.5 text-center font-medium"
                        >
                          {header}
                        </th>
                      ))}
                      <th className="px-6 py-2.5 text-right uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.people.map((person) => (
                      <tr key={person.id} className="border-t border-slate-100">
                        <td className="sticky left-0 bg-white px-6 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={person.name} />
                            <span className="whitespace-nowrap font-medium text-slate-800">
                              {person.name}
                            </span>
                          </div>
                        </td>
                        {person.counts.map((count, index) => (
                          <td key={index} className="px-1 py-1.5 text-center">
                            <span
                              className="mx-auto flex h-8 min-w-9 items-center justify-center rounded-md px-1 tabular-nums text-slate-900"
                              style={
                                count
                                  ? {
                                      backgroundColor: `rgba(42, 120, 214, ${0.1 + 0.4 * (count / activity.maxCell)})`,
                                    }
                                  : undefined
                              }
                            >
                              {count || <span className="text-slate-300">·</span>}
                            </span>
                          </td>
                        ))}
                        <td className="px-6 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                          {person.total}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 bg-slate-50/60 font-semibold text-slate-900">
                      <td className="sticky left-0 bg-slate-50 px-6 py-2.5 text-left">All panelists</td>
                      {activity.totals.map((count, index) => (
                        <td key={index} className="px-1 py-2.5 text-center tabular-nums">
                          {count}
                        </td>
                      ))}
                      <td className="px-6 py-2.5 text-right tabular-nums">{activity.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
