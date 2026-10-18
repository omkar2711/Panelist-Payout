import { createClient } from "@/lib/supabase/server";
import { Leaderboard } from "@/components/leaderboard";
import { PageHeader } from "@/components/page-header";
import { PeriodPicker } from "@/components/period-picker";
import { Scorecards, type Scorecard } from "@/components/scorecards";
import { fetchAllEntries } from "@/lib/all-entries";
import { monthsSince, parsePeriod } from "@/lib/period";
import { isCounted, panelistStats, todayInIndia } from "@/lib/performance";
import type { LeaderboardRow } from "@/lib/types";

function previousMonth(key: string) {
  const [year, month] = key.split("-").map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}

function lastDayOf(key: string) {
  const [year, month] = key.split("-").map(Number);
  return `${key}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
}

export default async function VendorLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const period = parsePeriod((await searchParams).period);
  const supabase = await createClient();
  const [{ data: board }, { data: panelists }, entries] = await Promise.all([
    supabase.rpc("get_leaderboard"),
    supabase
      .from("panelists")
      .select("id, active, profiles(full_name)")
      .returns<{ id: string; active: boolean; profiles: { full_name: string } }[]>(),
    fetchAllEntries(supabase),
  ]);

  const today = todayInIndia();
  // For a chosen month the board and scorecards are worked out as at that
  // month's last day (or today, for the current month).
  const asOf = period.isAll || period.key === today.slice(0, 7) ? today : lastDayOf(period.key);
  const counted = entries.filter(isCounted);
  const rows: LeaderboardRow[] = period.isAll
    ? ((board ?? []) as LeaderboardRow[])
    : ((board ?? []) as LeaderboardRow[]).map((row) => {
        const own = counted.filter((entry) => entry.panelist_id === row.panelist_id);
        return {
          ...row,
          month_count: own.filter((entry) => entry.interview_date.startsWith(period.key)).length,
          last_month_count: own.filter((entry) =>
            entry.interview_date.startsWith(previousMonth(period.key)),
          ).length,
        };
      });

  const cards: Scorecard[] = (panelists ?? [])
    .map((panelist) => {
      const own = entries.filter(
        (entry) => entry.panelist_id === panelist.id && entry.interview_date <= asOf,
      );
      return {
        id: panelist.id,
        name: panelist.profiles.full_name,
        active: panelist.active,
        pending: own.filter(
          (entry) =>
            entry.status === "submitted" &&
            (period.isAll || entry.interview_date.startsWith(period.key)),
        ).length,
        stats: panelistStats(own, asOf),
      };
    })
    .sort(
      (a, b) =>
        b.stats.thisMonth.count - a.stats.thisMonth.count ||
        b.stats.recentCount - a.stats.recentCount ||
        a.name.localeCompare(b.name),
    );

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        description="How active panelists rank, and a scorecard for each one."
        actions={
          <PeriodPicker
            months={monthsSince(entries.at(-1)?.interview_date, today)}
            value={period.key}
          />
        }
      />
      <Leaderboard
        rows={rows}
        fixedPeriod={period.isAll ? "all" : "month"}
        monthLabel={period.isAll ? undefined : period.label}
      />
      <div className="mt-6">
        <Scorecards cards={cards} monthHeading={period.isAll ? "This month" : period.label} />
      </div>
    </div>
  );
}
