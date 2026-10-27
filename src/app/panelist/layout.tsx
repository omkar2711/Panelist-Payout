import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSignedInProfile, getSignedInUserId } from "@/lib/session";
import { Nav } from "@/components/nav";
import { ORG_NAME } from "@/lib/brand";
import { DayChangeRefresh } from "@/components/day-change-refresh";
import { NoticeBanner } from "@/components/notice-banner";
import { PANELIST_NOTICE } from "@/lib/notices";

export default async function PanelistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getSignedInUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const [profile, { data: panelist }] = await Promise.all([
    getSignedInProfile(),
    supabase.from("panelists").select("active").eq("id", userId).maybeSingle(),
  ]);

  if (!profile) redirect("/login?error=no-account");
  if (profile.role !== "panelist") redirect("/vendor");
  if (!panelist?.active) redirect("/login?error=inactive");

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 via-slate-50 to-slate-50">
      <DayChangeRefresh />
      <Nav
        title={ORG_NAME}
        userLabel={profile.full_name}
        links={[
          { href: "/panelist", label: "Dashboard" },
          { href: "/panelist/leaderboard", label: "Leaderboard" },
        ]}
      />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {PANELIST_NOTICE ? <NoticeBanner {...PANELIST_NOTICE} /> : null}
        {children}
      </main>
    </div>
  );
}
