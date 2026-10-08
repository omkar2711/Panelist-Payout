import Link from "next/link";
import { Banknote, CalendarCheck, ClipboardList, Clock } from "lucide-react";
import { revokeEntry } from "@/app/panelist/actions";
import { AddEntryForm } from "@/components/add-entry-form";
import { EarningsExplorerLoader } from "@/components/earnings-explorer-loader";
import { StandingCard } from "@/components/leaderboard";
import { OutcomeLabel } from "@/components/outcome-label";
import { PanelistMomentum } from "@/components/panelist-momentum";
import { FeatureTile, StatTile, cardClass } from "@/components/stat-tile";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import { outcomeOf } from "@/lib/interview-rates";
import { panelistStats, todayInIndia } from "@/lib/performance";
import type { InterviewEntry, LeaderboardRow } from "@/lib/types";

const PAGE_SIZE = 10;

function PageLink({
  page,
  disabled,
  children,
}: {
  page: number;
  disabled: boolean;
  children: string;
}) {
  const className =
    "rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700";
  if (disabled) {
    return <span className={`${className} cursor-not-allowed opacity-40`}>{children}</span>;
  }
  return (
    <Link href={`/panelist?page=${page}`} scroll={false} className={`${className} hover:bg-slate-50`}>
      {children}
    </Link>
  );
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function PanelistDashboard({
  firstName,
  entries,
  leaderboard,
  userId,
  page,
}: {
  firstName: string;
  entries: InterviewEntry[];
  leaderboard: LeaderboardRow[];
  userId: string;
  page: number;
}) {
  const approved = entries.filter((e) => e.status === "approved");
  const paid = entries.filter((e) => e.status === "paid");
  const submitted = entries.filter((e) => e.status === "submitted");
  const amountDue = approved.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const amountPaid = paid.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const countedInterviews = [...approved, ...paid].filter(
    (e) => outcomeOf(e.outcome).payoutPercent > 0,
  ).length;

  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const firstRow = (currentPage - 1) * PAGE_SIZE;
  const pageEntries = entries.slice(firstRow, firstRow + PAGE_SIZE);
  const today = todayInIndia();
  const stats = panelistStats(entries, today);
  const earningPoints = [...approved, ...paid]
    .filter((e) => e.amount)
    .map((e) => ({ date: e.interview_date, amount: e.amount ?? 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Log your interviews and keep track of what you&apos;re owed.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <FeatureTile
          className="col-span-2"
          label="Amount due to you"
          value={formatCurrency(amountDue)}
          hint={
            approved.length > 0
              ? `${plural(approved.length, "approved interview")}, paid out in the monthly cycle`
              : "Nothing pending. Payouts are made once a month."
          }
        />

        <StatTile
          label="Paid to date"
          value={formatCurrency(amountPaid)}
          hint={`${plural(paid.length, "interview")} paid`}
          icon={Banknote}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatTile
          label="Approved interviews"
          value={String(countedInterviews)}
          hint="Counted on the leaderboard"
          icon={CalendarCheck}
          tone="bg-blue-50 text-blue-600"
        />
        <StatTile
          label="Awaiting review"
          value={String(submitted.length)}
          hint="Submitted, not yet approved"
          icon={Clock}
          tone="bg-amber-50 text-amber-600"
          className="col-span-2 xl:col-span-1"
        />
      </div>

      <PanelistMomentum stats={stats} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:order-2 xl:col-span-4">
          <section className={`${cardClass} p-6`}>
            <h2 className="text-sm font-semibold text-slate-900">Log an interview</h2>
            <p className="mb-4 mt-1 text-xs text-slate-400">
              It goes to the vendor for approval before it counts.
            </p>
            <AddEntryForm today={today} />
          </section>

          <StandingCard
            rows={leaderboard}
            currentUserId={userId}
            href="/panelist/leaderboard"
          />
        </div>

        <div className="space-y-6 xl:order-1 xl:col-span-8">
          <section className={`${cardClass} p-6`}>
            <EarningsExplorerLoader points={earningPoints} />
          </section>

          <section className={cardClass}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-900">My interviews</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {entries.length} total
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2.5 first:pl-6 last:pr-6">Date</th>
                      <th className="px-4 py-2.5 first:pl-6 last:pr-6">Type</th>
                      <th className="px-4 py-2.5 first:pl-6 last:pr-6">Candidate</th>
                      <th className="px-4 py-2.5 first:pl-6 last:pr-6">Scheduled</th>
                      <th className="px-4 py-2.5 first:pl-6 last:pr-6">Interview status</th>
                      <th className="px-4 py-2.5 first:pl-6 last:pr-6">Approval</th>
                      <th className="px-4 py-2.5 first:pl-6 last:pr-6 text-right">Amount</th>
                      <th className="px-4 py-2.5 first:pl-6 last:pr-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                      >
                        <td className="whitespace-nowrap px-4 py-3 first:pl-6 last:pr-6 font-medium text-slate-800">
                          <span className="block">{formatDate(entry.interview_date)}</span>
                          {formatTime(entry.start_time) ? (
                            <span className="block text-xs font-normal text-slate-400">
                              {formatTime(entry.start_time)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 first:pl-6 last:pr-6">{entry.interview_type ?? "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 first:pl-6 last:pr-6 text-slate-500">
                          {entry.candidate_ref ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 first:pl-6 last:pr-6 tabular-nums text-slate-500">
                          {entry.duration_minutes ? `${entry.duration_minutes} min` : "—"}
                        </td>
                        <td className="px-4 py-3 first:pl-6 last:pr-6 text-slate-600">
                          <OutcomeLabel outcome={entry.outcome} />
                        </td>
                        <td className="px-4 py-3 first:pl-6 last:pr-6">
                          <StatusBadge status={entry.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 first:pl-6 last:pr-6 text-right font-medium tabular-nums text-slate-900">
                          {entry.amount === null ? "—" : formatCurrency(entry.amount)}
                        </td>
                        <td className="px-4 py-3 first:pl-6 last:pr-6 text-right">
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
            {pageCount > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-3 text-sm">
                <p className="text-slate-500">
                  Showing {firstRow + 1}–{firstRow + pageEntries.length} of {entries.length}
                </p>
                <div className="flex items-center gap-2">
                  <PageLink page={currentPage - 1} disabled={currentPage <= 1}>
                    Previous
                  </PageLink>
                  <span className="px-1 tabular-nums text-slate-500">
                    Page {currentPage} of {pageCount}
                  </span>
                  <PageLink page={currentPage + 1} disabled={currentPage >= pageCount}>
                    Next
                  </PageLink>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
