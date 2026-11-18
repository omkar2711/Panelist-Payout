import type { createClient } from "@/lib/supabase/server";
import { withoutTestPanelists } from "@/lib/test-accounts";
import type { EntryStatus } from "@/lib/types";

export type LedgerEntry = {
  id: string;
  panelist_id: string;
  interview_date: string;
  created_at: string;
  duration_minutes: number | null;
  outcome: string;
  status: EntryStatus;
  amount: number | null;
};

// Supabase returns at most 1,000 rows per request, so read the log in batches.
const BATCH = 1000;

export async function fetchAllEntries(supabase: Awaited<ReturnType<typeof createClient>>) {
  const entries: LedgerEntry[] = [];
  for (let from = 0; ; from += BATCH) {
    const { data } = await supabase
      .from("interview_entries")
      .select("id, panelist_id, interview_date, created_at, duration_minutes, outcome, status, amount")
      .order("interview_date", { ascending: false })
      .order("id")
      .range(from, from + BATCH - 1)
      .returns<LedgerEntry[]>();
    entries.push(...(data ?? []));
    if (!data || data.length < BATCH) break;
  }
  return withoutTestPanelists(entries, (entry) => entry.panelist_id);
}
