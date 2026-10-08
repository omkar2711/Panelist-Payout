import { createClient } from "@/lib/supabase/server";
import { PanelistDashboard } from "@/components/panelist-dashboard";
import type { InterviewEntry, LeaderboardRow } from "@/lib/types";

export default async function PanelistDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { page } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: entries }, { data: leaderboard }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user!.id).single(),
    supabase
      .from("interview_entries")
      .select("*")
      .eq("panelist_id", user!.id)
      .order("interview_date", { ascending: false })
      .returns<InterviewEntry[]>(),
    supabase.rpc("get_leaderboard"),
  ]);

  return (
    <PanelistDashboard
      firstName={profile?.full_name?.split(" ")[0] ?? "there"}
      entries={entries ?? []}
      leaderboard={(leaderboard ?? []) as LeaderboardRow[]}
      userId={user!.id}
      page={typeof page === "string" ? Number.parseInt(page, 10) || 1 : 1}
    />
  );
}
