import type { ReactNode } from "react";
import { CalendarDays, Flame, ShieldCheck, Target } from "lucide-react";
import { cardClass } from "@/components/stat-tile";
import { TierBadge } from "@/components/tier-badge";
import { formatCurrency } from "@/lib/format";
import { RECENT_DAYS, type PanelistStats } from "@/lib/performance";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function Bar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 rounded-full bg-slate-100">
      <div className="h-2 rounded-full bg-[#2a78d6]" style={{ width: `${width}%` }} />
    </div>
  );
}

function Card({
  title,
  aside,
  icon,
  children,
}: {
  title: string;
  aside?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`${cardClass} p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {aside ? <p className="mt-0.5 text-xs text-slate-400">{aside}</p> : null}
        </div>
        {icon}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function IconChip({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
      {children}
    </span>
  );
}

function strikeSummary(strikes: PanelistStats["reliability"]["strikes"]) {
  return [
    strikes.noShow ? plural(strikes.noShow, "interviewer no-show") : "",
    strikes.wrong ? plural(strikes.wrong, "wrong interview") : "",
    strikes.rejected ? `${strikes.rejected} rejected ${strikes.rejected === 1 ? "entry" : "entries"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function PanelistMomentum({ stats }: { stats: PanelistStats }) {
  const { thisMonth, lastMonth, bestMonth, streak, reliability } = stats;

  let monthMessage: string;
  if (!bestMonth) {
    monthMessage = "Your first month on the board. It sets the bar for the next one.";
  } else if (thisMonth.count > bestMonth.count) {
    monthMessage = `New personal best, past your ${bestMonth.count} in ${bestMonth.label}.`;
  } else if (thisMonth.count === bestMonth.count) {
    monthMessage = `Level with your best month (${bestMonth.count} in ${bestMonth.label}). One more sets a record.`;
  } else {
    monthMessage = `${bestMonth.count - thisMonth.count} more to beat your best month (${bestMonth.count} in ${bestMonth.label}).`;
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card
        title="This month"
        aside={thisMonth.label}
        icon={
          <IconChip tone="bg-blue-50 text-blue-600">
            <CalendarDays className="h-4.5 w-4.5" strokeWidth={2.25} />
          </IconChip>
        }
      >
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-4xl font-semibold tabular-nums tracking-tight text-slate-900">
            {thisMonth.count}
          </span>
          <span className="text-sm text-slate-500">
            approved interview{thisMonth.count === 1 ? "" : "s"}
          </span>
          {thisMonth.awaiting > 0 ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
              +{thisMonth.awaiting} awaiting approval
            </span>
          ) : null}
        </p>
        {bestMonth ? <Bar value={thisMonth.count} max={bestMonth.count} /> : null}
        <p className="text-xs text-slate-500">{monthMessage}</p>
        <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
          Earned{" "}
          <span className="font-semibold tabular-nums text-slate-900">
            {formatCurrency(thisMonth.earned)}
          </span>{" "}
          so far, {formatCurrency(lastMonth.earned)} in {lastMonth.label}.
          {thisMonth.projectedEarnings ? (
            <>
              {" "}
              On pace for{" "}
              <span className="font-semibold tabular-nums text-slate-900">
                {formatCurrency(thisMonth.projectedEarnings)}
              </span>
              .
            </>
          ) : null}
        </p>
      </Card>

      <Card
        title="Streak and reliability"
        icon={
          <IconChip tone="bg-amber-50 text-amber-600">
            <Flame className="h-4.5 w-4.5" strokeWidth={2.25} />
          </IconChip>
        }
      >
        <div>
          <p className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums tracking-tight text-slate-900">
              {streak.current}
            </span>
            <span className="text-sm text-slate-500">
              week{streak.current === 1 ? "" : "s"} in a row with {streak.target}+ interviews
              {streak.best > streak.current ? ` · best ${streak.best}` : ""}
            </span>
          </p>
          <p className={`mt-1 text-xs ${streak.atRisk ? "font-medium text-amber-700" : "text-slate-500"}`}>
            {streak.thisWeek >= streak.target
              ? `This week counts: ${streak.thisWeek} logged, ${streak.target} needed.`
              : streak.atRisk
                ? `${streak.thisWeek} of ${streak.target} logged this week. ${streak.target - streak.thisWeek} more to keep the streak alive.`
                : `${streak.thisWeek} of ${streak.target} logged this week. Reach ${streak.target} to start a streak.`}
          </p>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="flex items-center gap-2 text-sm">
            <ShieldCheck
              className={`h-4 w-4 ${reliability.strikeTotal ? "text-red-500" : "text-emerald-600"}`}
            />
            <span className="font-semibold tabular-nums text-slate-900">
              {reliability.percent === null ? "—" : `${reliability.percent}%`}
            </span>
            <span className="text-slate-500">reliable, last {RECENT_DAYS} days</span>
          </p>
          <p
            className={`mt-1 text-xs ${reliability.strikeTotal ? "text-red-700" : "text-slate-500"}`}
          >
            {reliability.percent === null
              ? "Shown once your first interview has been reviewed."
              : reliability.strikeTotal
                ? `${strikeSummary(reliability.strikes)}. These count against you for ${RECENT_DAYS} days.`
                : "Clean record: no no-shows, wrong interviews or rejected entries."}
          </p>
        </div>
      </Card>

      <Card
        title="Level and milestones"
        aside={`Level is based on your last ${RECENT_DAYS} days`}
        icon={
          <IconChip tone="bg-indigo-50 text-indigo-600">
            <Target className="h-4.5 w-4.5" strokeWidth={2.25} />
          </IconChip>
        }
      >
        <div className="space-y-2">
          <p className="flex flex-wrap items-center gap-2">
            <TierBadge tier={stats.tier} size="lg" />
            <span className="text-sm text-slate-500">
              {plural(stats.recentCount, "approved interview")} in {RECENT_DAYS} days
            </span>
          </p>
          {stats.next ? (
            <>
              <Bar
                value={stats.recentCount - stats.tier.min}
                max={stats.next.min - stats.tier.min}
              />
              <p className="text-xs text-slate-500">
                {stats.toNext} more to reach {stats.next.label}. Levels drop again if you slow
                down.
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-500">
              Top level. Stay active to keep it, since it only counts the last {RECENT_DAYS}{" "}
              days.
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-3">
          {stats.nextMilestone ? (
            <>
              <p className="text-sm text-slate-600">
                <span className="font-semibold tabular-nums text-slate-900">{stats.lifetime}</span>{" "}
                of {stats.nextMilestone} interviews to your next milestone
              </p>
              <Bar
                value={stats.lifetime - stats.previousMilestone}
                max={stats.nextMilestone - stats.previousMilestone}
              />
            </>
          ) : (
            <p className="text-sm text-slate-600">
              <span className="font-semibold tabular-nums text-slate-900">{stats.lifetime}</span>{" "}
              interviews. Every milestone reached.
            </p>
          )}
          {stats.reached.length > 0 ? (
            <p className="text-xs text-slate-400">
              {plural(stats.reached.length, "milestone")} reached so far, latest at{" "}
              {stats.previousMilestone.toLocaleString("en-IN")}
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
