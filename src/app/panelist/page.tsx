import { createClient } from "@/lib/supabase/server";
import { getSignedInProfile } from "@/lib/session";
import { PanelistDashboard } from "@/components/panelist-dashboard";
import type { InterviewEntry, LeaderboardRow } from "@/lib/types";

export default async function PanelistDashboardPage() {
  const supabase = await createClient();
  // The layout has already checked the sign-in and loaded this profile.
  const profile = (await getSignedInProfile())!;

  const [{ data: entries }, { data: leaderboard }] = await Promise.all([
    supabase
      .from("interview_entries")
      .select("*")
      .eq("panelist_id", profile.id)
      .order("interview_date", { ascending: false })
      .returns<InterviewEntry[]>(),
    supabase.rpc("get_leaderboard"),
  ]);

  return (
    <PanelistDashboard
      firstName={profile.full_name.split(" ")[0] || "there"}
      entries={entries ?? []}
      leaderboard={(leaderboard ?? []) as LeaderboardRow[]}
      userId={profile.id}
    />
  );
}
