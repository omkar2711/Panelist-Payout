import { createClient } from "@/lib/supabase/server";
import {
  VendorDashboard,
  type PaymentItem,
  type PendingItem,
} from "@/components/vendor-dashboard";
import { fetchAllEntries } from "@/lib/all-entries";
import { financeByMonth, stalePendingCount, todayInIndia } from "@/lib/performance";
import type { PanelistBalance } from "@/lib/types";

type WithPanelist = { panelists: { profiles: { full_name: string } } };
type PendingRow = WithPanelist & {
  id: string;
  interview_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  outcome: string;
  interview_type: string | null;
};
type PaymentRow = WithPanelist & {
  id: string;
  amount: number;
  paid_on: string;
  mode: string | null;
};

export default async function VendorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: balances },
    { data: pendingRows, count: pendingTotal },
    { data: paymentRows },
    { data: receiptRows },
    entries,
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user!.id).single(),
    supabase.from("panelist_balances").select("*").returns<PanelistBalance[]>(),
    supabase
      .from("interview_entries")
      .select(
        "id, interview_date, start_time, duration_minutes, outcome, interview_type, panelists(profiles(full_name))",
        { count: "exact" },
      )
      .eq("status", "submitted")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<PendingRow[]>(),
    supabase
      .from("payments")
      .select("id, amount, paid_on, mode, panelists(profiles(full_name))")
      .order("paid_on", { ascending: false })
      .returns<PaymentRow[]>(),
    supabase.from("payout_batches").select("amount").returns<{ amount: number }[]>(),
    fetchAllEntries(supabase),
  ]);

  const today = todayInIndia();
  const thisMonth = today.slice(0, 7);
  const received = (receiptRows ?? []).reduce((sum, row) => sum + row.amount, 0);
  const ledger = financeByMonth(entries, received);
  // Payouts run monthly, so anything approved for an earlier month is overdue.
  const overdue = entries.filter(
    (entry) => entry.status === "approved" && entry.interview_date < `${thisMonth}-01`,
  );

  const pending: PendingItem[] = (pendingRows ?? []).map((row) => ({
    id: row.id,
    panelistName: row.panelists.profiles.full_name,
    interviewDate: row.interview_date,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    outcome: row.outcome,
    interviewType: row.interview_type,
  }));
  const payments: PaymentItem[] = (paymentRows ?? []).map((row) => ({
    id: row.id,
    panelistName: row.panelists.profiles.full_name,
    amount: row.amount,
    paidOn: row.paid_on,
    mode: row.mode,
  }));

  return (
    <VendorDashboard
      firstName={profile?.full_name?.split(" ")[0] ?? "there"}
      balances={balances ?? []}
      pending={pending}
      pendingTotal={pendingTotal ?? pending.length}
      payments={payments}
      ledger={{ ...ledger, currentMonth: thisMonth }}
      cash={{
        received,
        paidOut: payments.reduce((sum, payment) => sum + payment.amount, 0),
        owed: (balances ?? []).reduce((sum, row) => sum + row.amount_due, 0),
        billableAllTime: ledger.totals.billable,
      }}
      attention={{
        stalePending: stalePendingCount(entries, 3),
        overdueCount: overdue.length,
        overdueAmount: overdue.reduce((sum, entry) => sum + (entry.amount ?? 0), 0),
      }}
    />
  );
}
