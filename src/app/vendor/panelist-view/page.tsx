import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NoticeBanner } from "@/components/notice-banner";
import { PageHeader } from "@/components/page-header";
import { PanelistDashboard } from "@/components/panelist-dashboard";
import { PanelistPicker } from "@/components/panelist-picker";
import { PANELIST_NOTICE } from "@/lib/notices";
import { panelistDashboardData } from "@/lib/panelist-view";
import { isTestPanelist } from "@/lib/test-accounts";

type PanelistRow = { id: string; active: boolean; profiles: { full_name: string } };

export default async function PanelistViewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const wanted = (await searchParams).panelist;
  const supabase = await createClient();
  const { data } = await supabase
    .from("panelists")
    .select("id, active, profiles(full_name)")
    .returns<PanelistRow[]>();

  // Active panelists first, test accounts last.
  const rank = (p: PanelistRow) => (isTestPanelist(p.id) ? 2 : p.active ? 0 : 1);
  const panelists = (data ?? []).sort(
    (a, b) => rank(a) - rank(b) || a.profiles.full_name.localeCompare(b.profiles.full_name),
  );
  const chosen = panelists.find((p) => p.id === wanted) ?? panelists[0];

  if (!chosen) {
    return (
      <div>
        <PageHeader title="Panelist view" />
        <p className="text-sm text-slate-500">No panelists yet.</p>
      </div>
    );
  }

  const profile = { id: chosen.id, full_name: chosen.profiles.full_name };
  const { entries, leaderboard } = await panelistDashboardData(supabase, profile);
  const options = panelists.map((p) => ({
    id: p.id,
    label: `${p.profiles.full_name}${
      isTestPanelist(p.id) ? " (test account)" : p.active ? "" : " (inactive)"
    }`,
  }));

  return (
    <div>
      <PageHeader
        title="Panelist view"
        description="A panelist's dashboard exactly as they see it when they sign in."
        actions={<PanelistPicker panelists={options} value={chosen.id} />}
      />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 sm:px-5">
        <Eye className="mt-0.5 h-4.5 w-4.5 shrink-0 text-blue-600" strokeWidth={2.25} />
        <p>
          Viewing as <span className="font-semibold">{profile.full_name}</span>. This is a
          preview, so the form and buttons are switched off and nothing can be changed here.
          {!chosen.active ? " This panelist is inactive and can't sign in at the moment." : null}
          {isTestPanelist(chosen.id) ? " This test account sees sample data." : null}
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-blue-50/60 via-slate-50 to-slate-50 p-4 sm:p-6">
        {PANELIST_NOTICE ? <NoticeBanner {...PANELIST_NOTICE} /> : null}
        <PanelistDashboard
          firstName={profile.full_name.split(" ")[0] || "there"}
          entries={entries}
          leaderboard={leaderboard}
          userId={profile.id}
          preview
        />
      </div>
    </div>
  );
}
