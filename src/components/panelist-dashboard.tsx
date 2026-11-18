import { Banknote, CalendarCheck, Clock } from "lucide-react";
import { AddEntryForm } from "@/components/add-entry-form";
import { MyInterviews } from "@/components/my-interviews";
import { PeriodPicker } from "@/components/period-picker";
import { EarningsExplorerLoader } from "@/components/earnings-explorer-loader";
import { StandingCard } from "@/components/leaderboard";
import { PanelistMomentum } from "@/components/panelist-momentum";
import { FeatureTile, StatTile, cardClass } from "@/components/stat-tile";
import { formatCurrency } from "@/lib/format";
import { outcomeOf } from "@/lib/interview-rates";
import { panelistStats, todayInIndia } from "@/lib/performance";
import { inPeriod, type Period } from "@/lib/period";
import type { InterviewEntry, LeaderboardRow } from "@/lib/types";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function PanelistDashboard({
  firstName,
  entries,
  leaderboard,
  userId,
  period,
  months,
  preview = false,
}: {
  firstName: string;
  entries: InterviewEntry[];
  leaderboard: LeaderboardRow[];
  userId: string;
  // The month (or all time) the top figures cover, and the months to choose from.
  period: Period;
  months: string[];
  // Shown to the vendor exactly as the panelist sees it, with the form and
  // buttons switched off.
  preview?: boolean;
}) {
  const inScope = entries.filter((e) => inPeriod(period, e.interview_date));
  const approved = inScope.filter((e) => e.status === "approved");
  const paid = inScope.filter((e) => e.status === "paid");
  const submitted = inScope.filter((e) => e.status === "submitted");
  const forMonth = period.isAll ? "" : ` in ${period.label}`;
  const amountDue = approved.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const amountPaid = paid.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const countedInterviews = [...approved, ...paid].filter(
    (e) => outcomeOf(e.outcome).payoutPercent > 0,
  ).length;

  const today = todayInIndia();
  const stats = panelistStats(entries, today);
  // The chart always covers every month; it has its own day/week/month view.
  const earningPoints = entries
    .filter((e) => (e.status === "approved" || e.status === "paid") && e.amount)
    .map((e) => ({ date: e.interview_date, amount: e.amount ?? 0 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Log your interviews and keep track of what you&apos;re owed.
          </p>
        </div>
        <PeriodPicker months={months} value={period.key} />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <FeatureTile
          className="col-span-2"
          label={period.isAll ? "Amount due to you" : `Due to you for ${period.label}`}
          value={formatCurrency(amountDue)}
          hint={
            approved.length > 0
              ? `${plural(approved.length, "approved interview")}${forMonth}, paid out in the monthly cycle`
              : `Nothing pending${forMonth}. Payouts are made once a month.`
          }
        />

        <StatTile
          label={period.isAll ? "Paid to date" : "Paid"}
          value={formatCurrency(amountPaid)}
          hint={`${plural(paid.length, "interview")}${forMonth} paid`}
          icon={Banknote}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatTile
          label="Approved interviews"
          value={String(countedInterviews)}
          hint={period.isAll ? "Counted on the leaderboard" : `Counted for ${period.label}`}
          icon={CalendarCheck}
          tone="bg-blue-50 text-blue-600"
        />
        <StatTile
          label="Awaiting review"
          value={String(submitted.length)}
          hint={`Submitted${forMonth}, not yet approved`}
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
            <fieldset disabled={preview} className="disabled:opacity-60">
              <AddEntryForm today={today} />
            </fieldset>
          </section>

          <StandingCard
            rows={leaderboard}
            currentUserId={userId}
            href={preview ? undefined : "/panelist/leaderboard"}
          />
        </div>

        <div className="space-y-6 xl:order-1 xl:col-span-8">
          <section className={`${cardClass} p-6`}>
            <EarningsExplorerLoader points={earningPoints} />
          </section>

          {/* Remounted when the month changes, so its month filter follows the picker. */}
          <MyInterviews
            key={period.key}
            entries={entries}
            initialMonth={period.isAll ? "" : period.key}
            readOnly={preview}
          />
        </div>
      </div>
    </div>
  );
}
