import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { approveEntry, rejectEntry } from "@/app/vendor/actions";
import { Avatar } from "@/components/avatar";
import { OutcomeLabel } from "@/components/outcome-label";
import { PageHeader } from "@/components/page-header";
import { PeriodPicker } from "@/components/period-picker";
import { monthRange, parsePeriod } from "@/lib/period";
import { periodMonths } from "@/lib/period-months";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import type { InterviewEntry, Profile } from "@/lib/types";

type Row = InterviewEntry & { panelists: { profiles: Pick<Profile, "full_name"> } };

const HISTORY_PAGE_SIZE = 20;
const ROW_FIELDS = "*, panelists(profiles(full_name))";

function PageLink({
  page,
  period,
  disabled,
  children,
}: {
  page: number;
  period: string;
  disabled: boolean;
  children: string;
}) {
  const className =
    "rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700";
  if (disabled) {
    return <span className={`${className} cursor-not-allowed opacity-40`}>{children}</span>;
  }
  return (
    <Link
      href={`/vendor/entries?page=${page}${period === "all" ? "" : `&period=${period}`}`}
      scroll={false}
      className={`${className} hover:bg-slate-50`}
    >
      {children}
    </Link>
  );
}

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const requestedPage =
    typeof params.page === "string" ? Number.parseInt(params.page, 10) || 1 : 1;
  const period = parsePeriod(params.period);
  const range = monthRange(period);
  const supabase = await createClient();

  // Both tables follow the month the interview took place in.
  const scoped = <Q extends { gte: (c: string, v: string) => Q; lt: (c: string, v: string) => Q }>(
    query: Q,
  ) => (range ? query.gte("interview_date", range.from).lt("interview_date", range.to) : query);

  const [{ data: allPending }, { count: historyCount }, months] = await Promise.all([
    supabase
      .from("interview_entries")
      .select(ROW_FIELDS)
      .eq("status", "submitted")
      .order("created_at", { ascending: false })
      .returns<Row[]>(),
    scoped(
      supabase
        .from("interview_entries")
        .select("id", { count: "exact", head: true })
        .neq("status", "submitted"),
    ),
    periodMonths(supabase),
  ]);
  const pendingRows = (allPending ?? []).filter(
    (e) => !range || (e.interview_date >= range.from && e.interview_date < range.to),
  );
  const pendingElsewhere = (allPending ?? []).length - pendingRows.length;

  // Only one page of history is loaded at a time.
  const historyTotal = historyCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, requestedPage), pageCount);
  const firstRow = (currentPage - 1) * HISTORY_PAGE_SIZE;
  const { data: historyRows } = await scoped(
    supabase.from("interview_entries").select(ROW_FIELDS).neq("status", "submitted"),
  )
    .order("created_at", { ascending: false })
    .order("id")
    .range(firstRow, firstRow + HISTORY_PAGE_SIZE - 1)
    .returns<Row[]>();

  const pending = pendingRows ?? [];
  const rest = historyRows ?? [];

  return (
    <div>
      <PageHeader
        title="Approvals"
        description={
          period.isAll
            ? "Review, edit or remove the interviews panelists have logged."
            : `Interviews that took place in ${period.label}.`
        }
        actions={<PeriodPicker months={months} value={period.key} />}
      />

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-6 py-4 text-sm font-semibold text-slate-900">
          Awaiting your approval ({pending.length})
          {pendingElsewhere > 0 ? (
            <Link
              href="/vendor/entries"
              className="ml-2 text-xs font-normal text-blue-600 hover:underline"
            >
              + {pendingElsewhere} from other months
            </Link>
          ) : null}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-6 py-2.5">Panelist</th>
                <th className="px-6 py-2.5">Date &amp; time</th>
                <th className="px-6 py-2.5">Scheduled</th>
                <th className="px-6 py-2.5">Interview status</th>
                <th className="px-6 py-2.5">Type</th>
                <th className="px-6 py-2.5">Notes</th>
                <th className="px-6 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-center text-slate-400">
                    Nothing to review.
                  </td>
                </tr>
              ) : (
                pending.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={e.panelists.profiles.full_name} />
                        <span className="font-medium text-slate-800">
                          {e.panelists.profiles.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span className="block">{formatDate(e.interview_date)}</span>
                      <span className="block text-xs text-slate-400">
                        {formatTime(e.start_time) ?? "No time logged"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 tabular-nums">
                      {e.duration_minutes ? `${e.duration_minutes} mins` : "—"}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      <OutcomeLabel outcome={e.outcome} />
                    </td>
                    <td className="px-6 py-3">{e.interview_type ?? "—"}</td>
                    <td className="px-6 py-3 text-slate-500">{e.notes ?? "—"}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <form action={approveEntry.bind(null, e.id)}>
                          <button
                            type="submit"
                            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            Approve
                          </button>
                        </form>
                        <form action={rejectEntry.bind(null, e.id)}>
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Reject
                          </button>
                        </form>
                        <Link
                          href={`/vendor/entries/${e.id}`}
                          className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-6 py-4 text-sm font-semibold text-slate-900">
          History ({historyTotal}){period.isAll ? "" : ` · ${period.label}`}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-6 py-2.5">Panelist</th>
                <th className="px-6 py-2.5">Date &amp; time</th>
                <th className="px-6 py-2.5">Scheduled</th>
                <th className="px-6 py-2.5">Interview status</th>
                <th className="px-6 py-2.5">Approval</th>
                <th className="px-6 py-2.5">Amount</th>
                <th className="px-6 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rest.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-center text-slate-400">
                    No history yet.
                  </td>
                </tr>
              ) : (
                rest.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={e.panelists.profiles.full_name} />
                        <span className="font-medium text-slate-800">
                          {e.panelists.profiles.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span className="block">{formatDate(e.interview_date)}</span>
                      <span className="block text-xs text-slate-400">
                        {formatTime(e.start_time) ?? "No time logged"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 tabular-nums">
                      {e.duration_minutes ? `${e.duration_minutes} mins` : "—"}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      <OutcomeLabel outcome={e.outcome} />
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-6 py-3 tabular-nums">
                      {e.amount === null ? "—" : formatCurrency(e.amount)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {e.status === "paid" ? (
                        <span className="text-xs text-slate-400" title="Paid entries are locked">
                          Locked
                        </span>
                      ) : (
                        <Link
                            href={`/vendor/entries/${e.id}`}
                            className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pageCount > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-3 text-sm">
            <p className="text-slate-500">
              Showing {firstRow + 1}–{firstRow + rest.length} of {historyTotal}
            </p>
            <div className="flex items-center gap-2">
              <PageLink page={currentPage - 1} period={period.key} disabled={currentPage <= 1}>
                Previous
              </PageLink>
              <span className="px-1 tabular-nums text-slate-500">
                Page {currentPage} of {pageCount}
              </span>
              <PageLink
                page={currentPage + 1}
                period={period.key}
                disabled={currentPage >= pageCount}
              >
                Next
              </PageLink>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
