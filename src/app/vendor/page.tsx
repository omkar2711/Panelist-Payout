import { createClient } from "@/lib/supabase/server";
import { getSignedInProfile } from "@/lib/session";
import {
  VendorDashboard,
  type PaymentItem,
  type PendingItem,
} from "@/components/vendor-dashboard";
import { fetchAllEntries } from "@/lib/all-entries";
import { inPeriod, monthsSince, parsePeriod } from "@/lib/period";
import {
  financeByMonth,
  outcomeCountsByPanelist,
  stalePendingCount,
  todayInIndia,
} from "@/lib/performance";
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

export default async function VendorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const period = parsePeriod((await searchParams).period);
  const supabase = await createClient();
  // The layout has already checked the sign-in and loaded this profile.
  const profile = await getSignedInProfile();

  const [
    { data: balances },
    { data: pendingRows },
    { data: paymentRows },
    { data: receiptRows },
    entries,
  ] = await Promise.all([
    supabase.from("panelist_balances").select("*").returns<PanelistBalance[]>(),
    supabase
      .from("interview_entries")
      .select(
        "id, interview_date, start_time, duration_minutes, outcome, interview_type, panelists(profiles(full_name))",
      )
      .eq("status", "submitted")
      .order("created_at", { ascending: false })
      .returns<PendingRow[]>(),
    supabase
      .from("payments")
      .select("id, amount, paid_on, mode, panelists(profiles(full_name))")
      .order("paid_on", { ascending: false })
      .returns<PaymentRow[]>(),
    supabase
      .from("payout_batches")
      .select("amount")
      .returns<{ amount: number }[]>(),
    fetchAllEntries(supabase),
  ]);

  const today = todayInIndia();
  const thisMonth = today.slice(0, 7);
  const received = (receiptRows ?? []).reduce(
    (sum, row) => sum + row.amount,
    0,
  );
  const names = new Map(
    (balances ?? []).map((row) => [row.panelist_id, row.full_name]),
  );
  const ledger = financeByMonth(entries, received);
  // Payouts run monthly, so anything approved for an earlier month is overdue.
  const overdue = entries.filter(
    (entry) =>
      entry.status === "approved" && entry.interview_date < `${thisMonth}-01`,
  );

  // Interview figures follow the month the interview took place; payments
  // follow the date they were made. The cash position is always all time.
  const inScope = entries.filter((entry) =>
    inPeriod(period, entry.interview_date),
  );
  const sum = (rows: typeof entries) =>
    rows.reduce((total, entry) => total + (entry.amount ?? 0), 0);
  const scopedBalances: PanelistBalance[] = (balances ?? []).map((row) => {
    const own = inScope.filter(
      (entry) => entry.panelist_id === row.panelist_id,
    );
    return {
      ...row,
      amount_due: sum(own.filter((entry) => entry.status === "approved")),
      amount_paid: sum(own.filter((entry) => entry.status === "paid")),
      pending_review_count: own.filter((entry) => entry.status === "submitted")
        .length,
      approved_interview_count: own.filter(
        (entry) => entry.status === "approved" || entry.status === "paid",
      ).length,
    };
  });
  const pendingInScope = (pendingRows ?? []).filter((row) =>
    inPeriod(period, row.interview_date),
  );
  const emptyMonth = {
    interviews: 0,
    billable: 0,
    received: 0,
    receivable: 0,
    cost: 0,
    paid: 0,
    owed: 0,
    margin: 0,
    actualMargin: 0,
  };
  const focus = period.isAll
    ? ledger.totals
    : (ledger.months.find((month) => month.key === period.key) ?? emptyMonth);
  const months = monthsSince(entries.at(-1)?.interview_date, today);

  const pending: PendingItem[] = pendingInScope.slice(0, 5).map((row) => ({
    id: row.id,
    panelistName: row.panelists.profiles.full_name,
    interviewDate: row.interview_date,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    outcome: row.outcome,
    interviewType: row.interview_type,
  }));
  const allPayments: PaymentItem[] = (paymentRows ?? []).map((row) => ({
    id: row.id,
    panelistName: row.panelists.profiles.full_name,
    amount: row.amount,
    paidOn: row.paid_on,
    mode: row.mode,
  }));
  const payments = allPayments.filter((payment) =>
    inPeriod(period, payment.paidOn),
  );

  return (
    <VendorDashboard
      firstName={profile?.full_name?.split(" ")[0] ?? "there"}
      balances={scopedBalances}
      pending={pending}
      pendingTotal={pendingInScope.length}
      payments={payments}
      chartPayments={allPayments}
      ledger={{ ...ledger, currentMonth: thisMonth }}
      focus={focus}
      outcomes={outcomeCountsByPanelist(
        entries,
        names,
        period.isAll ? undefined : period.key,
      )}
      period={period}
      months={months}
      cash={{
        received,
        paidOut: allPayments.reduce(
          (total, payment) => total + payment.amount,
          0,
        ),
        owed: (balances ?? []).reduce((sum, row) => sum + row.amount_due, 0),
        billableAllTime: ledger.totals.billable,
      }}
      attention={{
        stalePending: stalePendingCount(entries, 3),
        overdueCount: overdue.length,
        overdueAmount: overdue.reduce(
          (sum, entry) => sum + (entry.amount ?? 0),
          0,
        ),
      }}
    />
  );
}
