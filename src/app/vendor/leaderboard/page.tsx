import { createClient } from "@/lib/supabase/server";
import { Leaderboard } from "@/components/leaderboard";
import { PageHeader } from "@/components/page-header";
import { Scorecards, type Scorecard } from "@/components/scorecards";
import { fetchAllEntries } from "@/lib/all-entries";
import { panelistStats, todayInIndia } from "@/lib/performance";
import type { LeaderboardRow } from "@/lib/types";

export default async function VendorLeaderboardPage() {
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
  const cards: Scorecard[] = (panelists ?? [])
    .map((panelist) => {
      const own = entries.filter((entry) => entry.panelist_id === panelist.id);
      return {
        id: panelist.id,
        name: panelist.profiles.full_name,
        active: panelist.active,
        pending: own.filter((entry) => entry.status === "submitted").length,
        stats: panelistStats(own, today),
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
      />
      <Leaderboard rows={(board ?? []) as LeaderboardRow[]} />
      <div className="mt-6">
        <Scorecards cards={cards} />
      </div>
    </div>
  );
}
