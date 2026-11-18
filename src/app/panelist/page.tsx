import { createClient } from "@/lib/supabase/server";
import { getSignedInProfile } from "@/lib/session";
import { PanelistDashboard } from "@/components/panelist-dashboard";
import { panelistDashboardData } from "@/lib/panelist-view";

export default async function PanelistDashboardPage() {
  const supabase = await createClient();
  // The layout has already checked the sign-in and loaded this profile.
  const profile = (await getSignedInProfile())!;
  const { entries, leaderboard } = await panelistDashboardData(supabase, profile);

  return (
    <PanelistDashboard
      firstName={profile.full_name.split(" ")[0] || "there"}
      entries={entries}
      leaderboard={leaderboard}
      userId={profile.id}
    />
  );
}
