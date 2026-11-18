import { createClient } from "@/lib/supabase/server";
import { getSignedInProfile } from "@/lib/session";
import { Leaderboard, StandingCard } from "@/components/leaderboard";
import { todayInIndia } from "@/lib/performance";
import {
  isTestPanelist,
  sampleEntries,
  sampleLeaderboard,
  withoutTestPanelists,
} from "@/lib/test-accounts";
import type { LeaderboardRow } from "@/lib/types";

export default async function PanelistLeaderboardPage() {
  const supabase = await createClient();
  const [profile, { data }] = await Promise.all([
    getSignedInProfile(),
    supabase.rpc("get_leaderboard"),
  ]);
  const board = (data ?? []) as LeaderboardRow[];
  const userId = profile?.id;
  const today = todayInIndia();
  // A test account is placed by its sample interviews; everyone else sees the
  // board without test accounts.
  const rows =
    profile && isTestPanelist(profile.id)
      ? sampleLeaderboard(
          board,
          profile.id,
          profile.full_name,
          sampleEntries(profile.id, today),
          today,
        )
      : withoutTestPanelists(board, (row) => row.panelist_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Leaderboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          All active panelists ranked by approved interviews.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <StandingCard rows={rows} currentUserId={userId!} />
        </div>
        <div className="xl:col-span-8">
          <Leaderboard rows={rows} currentUserId={userId ?? undefined} />
        </div>
      </div>
    </div>
  );
}
