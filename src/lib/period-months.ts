import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { monthsSince } from "@/lib/period";
import { todayInIndia } from "@/lib/performance";

// The months a vendor can pick: from the first logged interview to this month.
export async function periodMonths(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("interview_entries")
    .select("interview_date")
    .order("interview_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  return monthsSince(data?.interview_date, todayInIndia());
}
