import { createClient } from "@/lib/supabase/server";
import { getSignedInProfile } from "@/lib/session";
import {
  VendorDashboard,
  type PaymentItem,
  type PendingItem,
} from "@/components/vendor-dashboard";
import { fetchAllEntries } from "@/lib/all-entries";
import {
  NXTWAVE_TDS_RATE,
  PAYOUT_DEDUCTION_RATE,
  cashPaidByEntry,
  round2,
  type PaymentRecord,
} from "@/lib/deductions";
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
type PaymentRow = WithPanelist &
  PaymentRecord & {
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
    { data: links },
    { data: invoiceRows },
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
      .select(
        "id, panelist_id, amount, tds_amount, recovery_amount, paid_in_full, paid_on, mode, panelists(profiles(full_name))",
      )
      .order("paid_on", { ascending: false })
      .returns<PaymentRow[]>(),
    supabase
      .from("payout_batches")
      .select("amount")
      .returns<{ amount: number }[]>(),
    supabase
      .from("payment_entries")
      .select("payment_id, entry_id")
      .returns<{ payment_id: string; entry_id: string }[]>(),
    supabase
      .from("client_invoices")
      .select("month, amount")
      .returns<{ month: string; amount: number }[]>(),
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
  // What each paid interview actually cost after the 10% payout deduction.
  const cashPaid = cashPaidByEntry(entries, paymentRows ?? [], links ?? []);
  const invoiced = new Map((invoiceRows ?? []).map((row) => [row.month, Number(row.amount)]));
  const ledger = financeByMonth(entries, received, cashPaid, invoiced);
  const netOf = (amount: number | null) =>
    round2((amount ?? 0) * (1 - PAYOUT_DEDUCTION_RATE));
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
  // Still owed for an interview: its payout after the deduction, less any cash
  // already paid for it (negative while a September full payout is recovered).
  const owedFor = (entry: (typeof entries)[number]) =>
    round2(netOf(entry.amount) - (entry.status === "paid" ? (cashPaid.get(entry.id) ?? 0) : 0));
  const total = (values: number[]) => round2(values.reduce((t, v) => t + v, 0));
  const scopedBalances: PanelistBalance[] = (balances ?? []).map((row) => {
    const own = inScope.filter(
      (entry) => entry.panelist_id === row.panelist_id,
    );
    return {
      ...row,
      amount_due: total(
        own
          .filter((entry) => entry.status === "approved" || entry.status === "paid")
          .map(owedFor),
      ),
      amount_paid: total(
        own.filter((entry) => entry.status === "paid").map((entry) => cashPaid.get(entry.id) ?? 0),
      ),
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
    estimated: 0,
    invoiced: false,
    tds: 0,
    netDue: 0,
    received: 0,
    receivable: 0,
    cost: 0,
    deduction: 0,
    netCost: 0,
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
        owed: ledger.totals.owed,
        netDueAllTime: ledger.totals.netDue,
        // Receipts are what NxtWave paid after its 10% TDS.
        nxtwaveTds: round2((received * NXTWAVE_TDS_RATE) / (1 - NXTWAVE_TDS_RATE)),
        deductedFromPanelists: total(
          (paymentRows ?? []).map((p) => p.tds_amount + p.recovery_amount),
        ),
      }}
      attention={{
        stalePending: stalePendingCount(entries, 3),
        overdueCount: overdue.length,
        overdueAmount: total(overdue.map((entry) => netOf(entry.amount))),
      }}
    />
  );
}
