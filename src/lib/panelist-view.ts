import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { todayInIndia } from "@/lib/performance";
import {
  isTestPanelist,
  sampleEntries,
  sampleLeaderboard,
  withoutTestPanelists,
} from "@/lib/test-accounts";
import type { InterviewEntry, LeaderboardRow } from "@/lib/types";

// Everything a panelist's dashboard shows, shared by the panelist's own page and
// the vendor's "Panelist view" so the two always match. A test account sees
// sample interviews in place of its own; everyone else sees the board without
// test accounts.
export async function panelistDashboardData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  panelist: { id: string; full_name: string },
) {
  const [{ data: entries }, { data: leaderboard }] = await Promise.all([
    supabase
      .from("interview_entries")
      .select("*")
      .eq("panelist_id", panelist.id)
      .order("interview_date", { ascending: false })
      .returns<InterviewEntry[]>(),
    supabase.rpc("get_leaderboard"),
  ]);

  const board = (leaderboard ?? []) as LeaderboardRow[];
  if (isTestPanelist(panelist.id)) {
    const today = todayInIndia();
    const sample = sampleEntries(panelist.id, today);
    return {
      entries: sample,
      leaderboard: sampleLeaderboard(board, panelist.id, panelist.full_name, sample, today),
    };
  }
  return {
    entries: entries ?? [],
    leaderboard: withoutTestPanelists(board, (row) => row.panelist_id),
  };
}
