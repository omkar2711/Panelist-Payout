import { createClient } from "@/lib/supabase/server";
import { Leaderboard, StandingCard } from "@/components/leaderboard";
import type { LeaderboardRow } from "@/lib/types";

export default async function PanelistLeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase.rpc("get_leaderboard");
  const rows = (data ?? []) as LeaderboardRow[];

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
          <StandingCard rows={rows} currentUserId={user!.id} />
        </div>
        <div className="xl:col-span-8">
          <Leaderboard rows={rows} currentUserId={user?.id} />
        </div>
      </div>
    </div>
  );
}
