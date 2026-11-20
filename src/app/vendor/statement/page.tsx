import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { cardClass } from "@/components/stat-tile";
import { StatementTable, YearPicker, type StatementRow } from "@/components/statement-table";
import { NXTWAVE_TDS_RATE, round2 } from "@/lib/deductions";
import { financialYearsSince, parseFinancialYear } from "@/lib/financial-year";
import { formatExact } from "@/lib/format";
import { monthLabel, todayInIndia } from "@/lib/performance";
import { withoutTestPanelists } from "@/lib/test-accounts";

type PaymentRow = {
  id: string;
  panelist_id: string;
  amount: number;
  tds_amount: number;
  recovery_amount: number;
  adjustment_amount?: number;
  paid_in_full: boolean;
  paid_on: string;
  mode: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  panelists: { profiles: { full_name: string } };
};

type ReceiptRow = {
  id: string;
  amount: number;
  received_on: string;
  period_label: string | null;
  notes: string | null;
  created_at: string;
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const today = todayInIndia();
  const year = parseFinancialYear((await searchParams).fy, today);
  const supabase = await createClient();

  const [{ data: paymentRows }, { data: links }, { data: receiptRows }, { data: invoiceRows }] =
    await Promise.all([
      supabase
        .from("payments")
        .select(
          "*, panelists(profiles(full_name))",
        )
        .returns<PaymentRow[]>(),
      supabase.from("payment_entries").select("payment_id").returns<{ payment_id: string }[]>(),
      supabase
        .from("payout_batches")
        .select("id, amount, received_on, period_label, notes, created_at")
        .returns<ReceiptRow[]>(),
      supabase
        .from("client_invoices")
        .select("month, invoice_no, amount")
        .returns<{ month: string; invoice_no: string | null; amount: number }[]>(),
    ]);

  const payments = withoutTestPanelists(paymentRows ?? [], (p) => p.panelist_id);
  const interviewsIn = new Map<string, number>();
  for (const link of links ?? []) {
    interviewsIn.set(link.payment_id, (interviewsIn.get(link.payment_id) ?? 0) + 1);
  }
  const keptBack = (p: PaymentRow) =>
    round2(Number(p.tds_amount) + Number(p.recovery_amount) + Number(p.adjustment_amount ?? 0));

  // Every movement of money, oldest first, with a running balance.
  const movements = [
    ...(receiptRows ?? []).map((r) => ({
      id: `in-${r.id}`,
      date: r.received_on,
      created: r.created_at,
      direction: "in" as const,
      party: "NxtWave",
      description: "Received from NxtWave",
      details: r.period_label ? `For ${r.period_label}` : "",
      mode: null,
      reference: null,
      notes: r.notes,
      amount: Number(r.amount),
    })),
    ...payments.map((p) => {
      const parts = [plural(interviewsIn.get(p.id) ?? 0, "interview")];
      const gross = round2(Number(p.amount) + keptBack(p));
      if (p.paid_in_full) parts.push("paid in full, before the 10% deduction started");
      else {
        parts.push(`${formatExact(gross)} before deductions`);
        if (Number(p.tds_amount)) parts.push(`10% deduction ${formatExact(Number(p.tds_amount))}`);
        if (Number(p.recovery_amount)) {
          parts.push(`September adjustment ${formatExact(Number(p.recovery_amount))}`);
        }
        const other = Number(p.adjustment_amount ?? 0);
        if (other) {
          parts.push(`${other > 0 ? "paid less by" : "paid more by"} ${formatExact(Math.abs(other))}`);
        }
      }
      return {
        id: `out-${p.id}`,
        date: p.paid_on,
        created: p.created_at,
        direction: "out" as const,
        party: p.panelists.profiles.full_name,
        description: `Paid to ${p.panelists.profiles.full_name}`,
        details: parts.join(" · "),
        mode: p.mode,
        reference: p.reference,
        notes: p.notes,
        amount: Number(p.amount),
      };
    }),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.created.localeCompare(b.created));

  let balance = 0;
  let opening = 0;
  const rows: StatementRow[] = [];
  for (const movement of movements) {
    balance = round2(balance + (movement.direction === "in" ? movement.amount : -movement.amount));
    if (movement.date < year.from) opening = balance;
    else if (movement.date <= year.to) rows.push({ ...movement, balance });
  }
  const closing = rows.at(-1)?.balance ?? opening;
  // Newest first, like a bank statement on screen.
  rows.reverse();

  const inYear = (date: string) => date >= year.from && date <= year.to;
  const moneyIn = round2(rows.filter((r) => r.direction === "in").reduce((s, r) => s + r.amount, 0));
  const moneyOut = round2(rows.filter((r) => r.direction === "out").reduce((s, r) => s + r.amount, 0));
  const yearPayments = payments.filter((p) => inYear(p.paid_on));
  const invoices = (invoiceRows ?? []).filter((i) => inYear(`${i.month}-01`));
  const invoiced = round2(invoices.reduce((s, i) => s + Number(i.amount), 0));
  // Receipts are what NxtWave paid after its 10% TDS.
  const nxtwaveTds = round2((moneyIn * NXTWAVE_TDS_RATE) / (1 - NXTWAVE_TDS_RATE));

  const byPanelist = new Map<
    string,
    { name: string; payments: number; interviews: number; gross: number; kept: number; paid: number }
  >();
  for (const p of yearPayments) {
    const row = byPanelist.get(p.panelist_id) ?? {
      name: p.panelists.profiles.full_name,
      payments: 0,
      interviews: 0,
      gross: 0,
      kept: 0,
      paid: 0,
    };
    row.payments += 1;
    row.interviews += interviewsIn.get(p.id) ?? 0;
    row.kept = round2(row.kept + keptBack(p));
    row.paid = round2(row.paid + Number(p.amount));
    row.gross = round2(row.paid + row.kept);
    byPanelist.set(p.panelist_id, row);
  }
  const panelistRows = [...byPanelist.values()].sort((a, b) => b.paid - a.paid);
  const totalOf = (pick: (row: (typeof panelistRows)[number]) => number) =>
    round2(panelistRows.reduce((s, row) => s + pick(row), 0));

  const earliest = movements[0]?.date;
  const years = financialYearsSince(earliest, today).map((y) => ({ key: y.key, label: y.label }));
  const periodText = year.isAll ? "all time" : `${year.label} (1 Apr ${year.from.slice(0, 4)} to 31 Mar ${year.to.slice(0, 4)})`;

  const summary = [
    { label: "Opening balance", value: opening },
    { label: "Money in", value: moneyIn, tone: "text-emerald-700" },
    { label: "Money out", value: moneyOut },
    { label: "Closing balance", value: closing, strong: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statement"
        description={`Every rupee received from NxtWave and paid to panelists, ${periodText}.`}
        actions={<YearPicker years={years} value={year.key} />}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {summary.map((tile) => (
          <div key={tile.label} className={`${cardClass} p-5`}>
            <p className="text-sm text-slate-500">{tile.label}</p>
            <p
              className={`mt-1 text-xl tabular-nums ${tile.strong ? "font-semibold text-slate-900" : "font-medium"} ${tile.tone ?? "text-slate-900"}`}
            >
              {formatExact(tile.value)}
            </p>
          </div>
        ))}
      </div>

      <StatementTable
        rows={rows}
        opening={opening}
        closing={closing}
        title={`Transactions, ${year.label}`}
        fileName={`expertbench-statement-${year.isAll ? "all-time" : year.label.replace(/\s+/g, "-").toLowerCase()}.csv`}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className={`${cardClass} p-6 xl:col-span-5 print:break-inside-avoid`}>
          <h2 className="text-sm font-semibold text-slate-900">For your tax return</h2>
          <p className="mt-1 text-xs text-slate-400">
            {year.label}. Check NxtWave&apos;s TDS against your Form 26AS before you file.
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            {[
              [
                `Invoiced to NxtWave${invoices.length ? ` (${invoices.map((i) => monthLabel(i.month)).join(", ")})` : ""}`,
                invoiced,
              ],
              ["Received from NxtWave", moneyIn],
              ["TDS deducted by NxtWave (10% of the bill behind those receipts)", nxtwaveTds],
              ["Panelist payouts before deductions", totalOf((row) => row.gross)],
              ["Kept back from panelists (10% deduction and adjustments)", totalOf((row) => row.kept)],
              ["Paid out to panelists", moneyOut],
              ["Received less paid out", round2(moneyIn - moneyOut)],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
                <dt className="text-slate-600">{label}</dt>
                <dd className="whitespace-nowrap font-medium tabular-nums text-slate-900">
                  {formatExact(Number(value))}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={`${cardClass} xl:col-span-7 print:break-inside-avoid`}>
          <h2 className="border-b border-slate-100 px-6 py-4 text-sm font-semibold text-slate-900">
            Paid to each panelist, {year.label}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-2.5">Panelist</th>
                  <th className="px-3 py-2.5 text-right">Interviews</th>
                  <th className="px-3 py-2.5 text-right">Before deductions</th>
                  <th className="px-3 py-2.5 text-right">Kept back</th>
                  <th className="px-6 py-2.5 text-right">Paid</th>
                </tr>
              </thead>
              <tbody>
                {panelistRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                      No payments in this period.
                    </td>
                  </tr>
                ) : (
                  panelistRows.map((row) => (
                    <tr key={row.name} className="border-t border-slate-100">
                      <td className="px-6 py-2.5 font-medium text-slate-800">
                        {row.name}
                        <span className="ml-1 text-xs font-normal text-slate-400">
                          {plural(row.payments, "payment")}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{row.interviews}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatExact(row.gross)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{formatExact(row.kept)}</td>
                      <td className="px-6 py-2.5 text-right font-medium tabular-nums">{formatExact(row.paid)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {panelistRows.length > 0 ? (
                <tfoot>
                  <tr className="border-t border-slate-200 font-semibold text-slate-900">
                    <td className="px-6 py-2.5">Total</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{totalOf((row) => row.interviews)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatExact(totalOf((row) => row.gross))}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatExact(totalOf((row) => row.kept))}</td>
                    <td className="px-6 py-2.5 text-right tabular-nums">{formatExact(totalOf((row) => row.paid))}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
