import { createClient } from "@/lib/supabase/server";
import { InterviewExplorerLoader } from "@/components/interview-explorer-loader";
import type { InterviewRow } from "@/components/interview-explorer";
import type { EntryStatus } from "@/lib/types";

type EntryRow = {
  id: string;
  panelist_id: string;
  interview_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  outcome: string;
  interview_type: string | null;
  candidate_ref: string | null;
  status: EntryStatus;
  amount: number | null;
  panelists: { profiles: { full_name: string } };
};

// Supabase returns at most 1,000 rows per request, so read the log in batches.
const BATCH = 1000;

export default async function InterviewsPage() {
  const supabase = await createClient();

  const entries: EntryRow[] = [];
  for (let from = 0; ; from += BATCH) {
    const { data } = await supabase
      .from("interview_entries")
      .select(
        "id, panelist_id, interview_date, start_time, duration_minutes, outcome, interview_type, candidate_ref, status, amount, panelists(profiles(full_name))",
      )
      .order("interview_date", { ascending: false })
      .order("id")
      .range(from, from + BATCH - 1)
      .returns<EntryRow[]>();
    entries.push(...(data ?? []));
    if (!data || data.length < BATCH) break;
  }

  const { data: panelistRows } = await supabase
    .from("panelists")
    .select("id, profiles(full_name)")
    .returns<{ id: string; profiles: { full_name: string } }[]>();

  const rows: InterviewRow[] = entries.map((entry) => ({
    id: entry.id,
    panelistId: entry.panelist_id,
    panelistName: entry.panelists.profiles.full_name,
    date: entry.interview_date,
    startTime: entry.start_time,
    minutes: entry.duration_minutes,
    outcome: entry.outcome,
    type: entry.interview_type,
    candidate: entry.candidate_ref,
    status: entry.status,
    amount: entry.amount,
  }));
  const panelists = (panelistRows ?? [])
    .map((panelist) => ({ id: panelist.id, name: panelist.profiles.full_name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return <InterviewExplorerLoader rows={rows} panelists={panelists} />;
}
