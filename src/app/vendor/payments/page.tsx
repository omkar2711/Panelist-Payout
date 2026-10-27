import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { PeriodPicker } from "@/components/period-picker";
import { recoverableFor } from "@/lib/deductions";
import { inPeriod, parsePeriod } from "@/lib/period";
import { periodMonths } from "@/lib/period-months";
import { ReceiptForm } from "@/components/receipt-form";
import { RecordPaymentForm } from "@/components/record-payment-form";
import { formatCurrency, formatDate } from "@/lib/format";
import { todayInIndia } from "@/lib/performance";
import type { InterviewEntry, Panelist, Payment, Profile } from "@/lib/types";

type PanelistRow = Panelist & { profiles: Pick<Profile, "full_name"> };
type Receipt = {
  id: string;
  amount: number;
  received_on: string;
  period_label: string | null;
  notes: string | null;
};
type PaymentRow = Payment & { panelists: { profiles: Pick<Profile, "full_name"> } };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const period = parsePeriod((await searchParams).period);
  const supabase = await createClient();

  const [
    { data: panelists },
    { data: approvedEntries },
    { data: allPayments },
    { data: allReceipts },
    months,
  ] = await Promise.all([
      supabase
        .from("panelists")
        .select("*, profiles(full_name)")
        .returns<PanelistRow[]>(),
      supabase
        .from("interview_entries")
        .select("id, panelist_id, interview_date, amount")
        .eq("status", "approved")
        .order("interview_date", { ascending: true })
        .returns<Pick<InterviewEntry, "id" | "panelist_id" | "interview_date" | "amount">[]>(),
      supabase
        .from("payments")
        .select("*, panelists(profiles(full_name))")
        .order("paid_on", { ascending: false })
        .returns<PaymentRow[]>(),
      supabase
        .from("payout_batches")
        .select("id, amount, received_on, period_label, notes")
        .order("received_on", { ascending: false })
        .returns<Receipt[]>(),
      periodMonths(supabase),
    ]);

  // Payments and receipts follow the date the money moved; the payment form
  // offers the chosen month's approved interviews.
  const payments = (allPayments ?? []).filter((p) => inPeriod(period, p.paid_on));
  const receipts = (allReceipts ?? []).filter((r) => inPeriod(period, r.received_on));
  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const deductedTotal = payments.reduce((sum, p) => sum + p.tds_amount + p.recovery_amount, 0);
  // What is still to be recovered from each panelist's September full payout.
  const recoverable = Object.fromEntries(
    (panelists ?? []).map((p) => [
      p.id,
      recoverableFor((allPayments ?? []).filter((pay) => pay.panelist_id === p.id)),
    ]),
  );

  // Active panelists, plus inactive ones who are still owed money.
  const owedIds = new Set((approvedEntries ?? []).map((e) => e.panelist_id));
  const panelistOptions = (panelists ?? [])
    .filter((p) => p.active || owedIds.has(p.id))
    .map((p) => ({
      id: p.id,
      full_name: p.active ? p.profiles.full_name : `${p.profiles.full_name} (inactive)`,
    }));

  const entries = (approvedEntries ?? [])
    .filter((e) => inPeriod(period, e.interview_date))
    .map((e) => ({
    ...e,
    amount: e.amount ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Payments"
        description={
          period.isAll
            ? "Pay panelists against approved interviews and see history."
            : `Payments and receipts in ${period.label}; the form lists ${period.label} interviews.`
        }
        actions={<PeriodPicker months={months} value={period.key} />}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm xl:col-span-5 xl:self-start">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Record a payment
          </h2>
          {panelistOptions.length === 0 ? (
            <p className="text-sm text-slate-400">
              Add an active panelist first.
            </p>
          ) : (
            <RecordPaymentForm
              panelists={panelistOptions}
              approvedEntries={entries}
              recoverable={recoverable}
            />
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm xl:col-span-7 xl:self-start">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Payment history{period.isAll ? "" : ` · ${period.label}`}
            </h2>
            <p className="text-sm text-slate-500">
              Paid{" "}
              <span className="font-semibold tabular-nums text-slate-900">
                {formatCurrency(paidTotal)}
              </span>
              {deductedTotal > 0 ? (
                <span className="text-slate-400"> · {formatCurrency(deductedTotal)} deducted</span>
              ) : null}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-2.5">Panelist</th>
                  <th className="px-6 py-2.5">Paid on</th>
                  <th className="px-6 py-2.5">Mode</th>
                  <th className="px-6 py-2.5 text-right">Interviews</th>
                  <th className="px-6 py-2.5 text-right">Deducted</th>
                  <th className="px-6 py-2.5 text-right">Paid</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-slate-400">
                      {period.isAll ? "No payments recorded yet." : `No payments made in ${period.label}.`}
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={p.panelists.profiles.full_name} />
                          <span className="font-medium text-slate-800">
                            {p.panelists.profiles.full_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3">{formatDate(p.paid_on)}</td>
                      <td className="px-6 py-3 text-slate-500">{p.mode ?? "—"}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-slate-500">
                        {formatCurrency(p.amount + p.tds_amount + p.recovery_amount)}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-slate-500">
                        {p.tds_amount + p.recovery_amount > 0 ? (
                          <span
                            title={`10% deduction ${formatCurrency(p.tds_amount)}${
                              p.recovery_amount ? ` + September adjustment ${formatCurrency(p.recovery_amount)}` : ""
                            }`}
                          >
                            −{formatCurrency(p.tds_amount + p.recovery_amount)}
                          </span>
                        ) : p.paid_in_full ? (
                          <span className="text-xs text-slate-400">Paid in full</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-3 text-right font-medium tabular-nums">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <h2
        id="received"
        className="mb-1 mt-10 scroll-mt-24 text-lg font-semibold tracking-tight text-slate-900"
      >
        Money received from NxtWave
      </h2>
      <p className="mb-4 text-sm text-slate-500">
        Record each payment NxtWave makes to you, so the dashboard can show your cash position.
      </p>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm xl:col-span-5 xl:self-start">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Record a receipt</h3>
          <ReceiptForm today={todayInIndia()} />
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm xl:col-span-7 xl:self-start">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Receipts{period.isAll ? "" : ` · ${period.label}`}
            </h3>
            <p className="text-sm text-slate-500">
              Total received:{" "}
              <span className="font-semibold tabular-nums text-slate-900">
                {formatCurrency(receipts.reduce((sum, r) => sum + r.amount, 0))}
              </span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-2.5">Received on</th>
                  <th className="px-6 py-2.5">For</th>
                  <th className="px-6 py-2.5">Notes</th>
                  <th className="px-6 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-center text-slate-400">
                      {period.isAll ? "No receipts recorded yet." : `No receipts in ${period.label}.`}
                    </td>
                  </tr>
                ) : (
                  receipts.map((receipt) => (
                    <tr
                      key={receipt.id}
                      className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                    >
                      <td className="whitespace-nowrap px-6 py-3">
                        {formatDate(receipt.received_on)}
                      </td>
                      <td className="px-6 py-3 text-slate-600">{receipt.period_label ?? "—"}</td>
                      <td className="px-6 py-3 text-slate-500">{receipt.notes ?? "—"}</td>
                      <td className="whitespace-nowrap px-6 py-3 text-right font-medium tabular-nums">
                        {formatCurrency(receipt.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
