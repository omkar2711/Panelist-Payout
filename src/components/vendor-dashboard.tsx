import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  BarChart3,
  CircleCheckBig,
  Clock,
  FileText,
  Receipt,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { EarningsChart } from "@/components/earnings-chart";
import { FeatureTile, StatTile, cardClass } from "@/components/stat-tile";
import { formatCurrency, formatDate, formatTime, monthAxisLabel } from "@/lib/format";
import { outcomeOf } from "@/lib/interview-rates";
import type { PanelistBalance } from "@/lib/types";

export type PendingItem = {
  id: string;
  panelistName: string;
  interviewDate: string;
  startTime: string | null;
  durationMinutes: number | null;
  outcome: string;
  interviewType: string | null;
};

export type PaymentItem = {
  id: string;
  panelistName: string;
  amount: number;
  paidOn: string;
  mode: string | null;
};

function monthlyPaidSeries(payments: PaymentItem[]) {
  const totals = new Map<string, number>();
  for (const payment of payments) {
    const monthKey = payment.paidOn.slice(0, 7); // yyyy-mm
    totals.set(monthKey, (totals.get(monthKey) ?? 0) + payment.amount);
  }
  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([monthKey, amount], index) => ({
      label: monthAxisLabel(monthKey, index),
      amount,
    }));
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-slate-50 px-6 text-center">
      <BarChart3 className="h-6 w-6 text-slate-300" />
      <p className="mt-2 text-sm text-slate-400">{message}</p>
    </div>
  );
}

function CardLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export type Finance = {
  monthLabel: string;
  billable: number;
  cost: number;
  margin: number;
  interviews: number;
  unbillable: number;
};

export type Cash = {
  received: number;
  paidOut: number;
  owed: number;
  billableAllTime: number;
};

export type Attention = {
  stalePending: number;
  overdueCount: number;
  overdueAmount: number;
};

function CashRow({
  label,
  value,
  strong = false,
  hint,
}: {
  label: string;
  value: number;
  strong?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className={strong ? "text-sm font-semibold text-slate-900" : "text-sm text-slate-600"}>
        {label}
        {hint ? <span className="block text-xs font-normal text-slate-400">{hint}</span> : null}
      </span>
      <span
        className={`tabular-nums ${
          strong ? "text-base font-semibold" : "text-sm font-medium"
        } ${value < 0 ? "text-red-600" : "text-slate-900"}`}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

export function VendorDashboard({
  firstName,
  balances,
  pending,
  pendingTotal,
  payments,
  finance,
  cash,
  attention,
}: {
  firstName: string;
  balances: PanelistBalance[];
  pending: PendingItem[];
  pendingTotal: number;
  payments: PaymentItem[];
  finance: Finance;
  cash: Cash;
  attention: Attention;
}) {
  const totalDue = balances.reduce((sum, row) => sum + row.amount_due, 0);
  const totalPaid = balances.reduce((sum, row) => sum + row.amount_paid, 0);
  const owedCount = balances.filter((row) => row.amount_due > 0).length;
  const activeCount = balances.filter((row) => row.active).length;

  const dueByPanelist = balances
    .filter((row) => row.amount_due > 0)
    .sort((a, b) => b.amount_due - a.amount_due)
    .slice(0, 6);
  const maxDue = Math.max(1, ...dueByPanelist.map((row) => row.amount_due));
  const paidByMonth = monthlyPaidSeries(payments);
  const recentPayments = payments.slice(0, 5);
  const sortedBalances = [...balances].sort(
    (a, b) => b.amount_due - a.amount_due || a.full_name.localeCompare(b.full_name),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s where interviews and payouts stand.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <FeatureTile
          className="col-span-2"
          label="Total owed to panelists"
          value={formatCurrency(totalDue)}
          hint={
            owedCount > 0
              ? `${plural(owedCount, "panelist")} awaiting payout`
              : "Everyone is paid up"
          }
        >
          <Link
            href="/vendor/payments"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25"
          >
            Record a payment
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </FeatureTile>

        <StatTile
          label="Paid out"
          value={formatCurrency(totalPaid)}
          hint={`${plural(payments.length, "payment")} recorded`}
          icon={Banknote}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatTile
          label="Awaiting approval"
          value={String(pendingTotal)}
          hint={pendingTotal > 0 ? "Waiting on your review" : "Nothing to review"}
          icon={Clock}
          tone="bg-amber-50 text-amber-600"
        />
        <StatTile
          label="Active panelists"
          value={String(activeCount)}
          hint={`${balances.length} in total`}
          icon={Users}
          tone="bg-blue-50 text-blue-600"
          className="col-span-2 xl:col-span-1"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label={`Billable to NxtWave, ${finance.monthLabel}`}
          value={formatCurrency(finance.billable)}
          hint={`${plural(finance.interviews, "approved interview")}${
            finance.unbillable ? `, ${finance.unbillable} without a billable slot` : ""
          }`}
          icon={FileText}
          tone="bg-blue-50 text-blue-600"
        />
        <StatTile
          label={`Panelist cost, ${finance.monthLabel}`}
          value={formatCurrency(finance.cost)}
          hint="What those interviews pay out"
          icon={Wallet}
          tone="bg-amber-50 text-amber-600"
        />
        <StatTile
          label={`Margin, ${finance.monthLabel}`}
          value={formatCurrency(finance.margin)}
          hint={
            finance.interviews === 0
              ? "Nothing approved yet this month"
              : finance.margin < 0
                ? "Payouts are higher than what can be billed"
                : `${Math.round((finance.margin / finance.billable) * 100)}% of the billable amount`
          }
          icon={TrendingUp}
          tone="bg-emerald-50 text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className={`${cardClass} p-6`}>
              <h2 className="text-sm font-semibold text-slate-900">Amount due by panelist</h2>
              <p className="mb-4 mt-1 text-xs text-slate-400">
                Approved, not yet paid{owedCount > 6 ? " · top 6" : ""}
              </p>
              {dueByPanelist.length > 0 ? (
                <ul className="flex min-h-64 flex-col gap-4 pt-1">
                  {dueByPanelist.map((row) => (
                    <li
                      key={row.panelist_id}
                      className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 text-sm"
                    >
                      <span className="truncate font-medium text-slate-700">
                        {row.full_name}
                      </span>
                      <div className="h-2.5 rounded-full bg-slate-100">
                        <div
                          className="h-2.5 rounded-full bg-[#2a78d6]"
                          style={{ width: `${(row.amount_due / maxDue) * 100}%` }}
                        />
                      </div>
                      <span className="font-semibold tabular-nums text-slate-900">
                        {formatCurrency(row.amount_due)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ChartEmpty message="No one is owed anything right now." />
              )}
            </section>

            <section className={`${cardClass} p-6`}>
              <h2 className="text-sm font-semibold text-slate-900">Paid out by month</h2>
              <p className="mb-4 mt-1 text-xs text-slate-400">Last 6 months</p>
              {paidByMonth.length > 0 ? (
                <EarningsChart data={paidByMonth} />
              ) : (
                <ChartEmpty message="Payments will show here once you record one." />
              )}
            </section>
          </div>

          <section className={cardClass}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Panelists</h2>
              <CardLink href="/vendor/panelists">Manage panelists</CardLink>
            </div>
            {sortedBalances.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Users className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-sm text-slate-400">
                  No panelists yet.{" "}
                  <Link href="/vendor/panelists" className="text-blue-600 hover:underline">
                    Add your first one
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-2.5">Name</th>
                      <th className="px-4 py-2.5 text-right">Interviews</th>
                      <th className="px-4 py-2.5 text-right">In review</th>
                      <th className="px-4 py-2.5 text-right">Due</th>
                      <th className="px-4 py-2.5 text-right">Paid</th>
                      <th className="px-6 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBalances.map((row) => (
                      <tr
                        key={row.panelist_id}
                        className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={row.full_name} />
                            <span className="font-medium text-slate-800">{row.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                          {row.approved_interview_count}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                          {row.pending_review_count}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                          {formatCurrency(row.amount_due)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-500">
                          {formatCurrency(row.amount_paid)}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 ${row.active ? "text-emerald-700" : "text-slate-400"}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${row.active ? "bg-emerald-500" : "bg-slate-300"}`}
                            />
                            {row.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6 xl:col-span-4">
          {attention.stalePending > 0 || attention.overdueCount > 0 ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <TriangleAlert className="h-4 w-4" />
                Needs attention
              </h2>
              <ul className="mt-2 space-y-1.5 text-sm text-amber-900">
                {attention.stalePending > 0 ? (
                  <li>
                    <Link href="/vendor/entries" className="hover:underline">
                      {attention.stalePending}{" "}
                      {attention.stalePending === 1 ? "entry has" : "entries have"} waited more
                      than 3 days for approval
                    </Link>
                  </li>
                ) : null}
                {attention.overdueCount > 0 ? (
                  <li>
                    <Link href="/vendor/payments" className="hover:underline">
                      {formatCurrency(attention.overdueAmount)} from earlier months still
                      unpaid ({plural(attention.overdueCount, "interview")})
                    </Link>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          <section className={`${cardClass} p-6`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Cash position</h2>
              <CardLink href="/vendor/payments#received">Record a receipt</CardLink>
            </div>
            <div className="mt-2 divide-y divide-slate-100">
              <CashRow label="Received from NxtWave" value={cash.received} />
              <CashRow label="Paid to panelists" value={cash.paidOut} />
              <CashRow label="Cash in hand" value={cash.received - cash.paidOut} strong />
              <CashRow
                label="Owed to panelists"
                value={cash.owed}
                hint="Approved, not yet paid"
              />
              <CashRow
                label="Left after paying everyone"
                value={cash.received - cash.paidOut - cash.owed}
                strong
              />
              <CashRow
                label="Still to come from NxtWave"
                value={cash.billableAllTime - cash.received}
                hint="Billable for approved interviews, less what's been received"
              />
            </div>
          </section>

          <section className={`${cardClass} p-6`}>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                Awaiting approval
                {pendingTotal > 0 ? (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-amber-800">
                    {pendingTotal}
                  </span>
                ) : null}
              </h2>
              <CardLink href="/vendor/entries">Review all</CardLink>
            </div>
            {pending.length === 0 ? (
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-8 text-center">
                <CircleCheckBig className="mx-auto h-6 w-6 text-emerald-500" />
                <p className="mt-2 text-sm text-slate-500">You&apos;re all caught up.</p>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {pending.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/vendor/entries/${item.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50"
                    >
                      <Avatar name={item.panelistName} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">
                          {item.panelistName}
                        </span>
                        <span className="block truncate text-xs text-slate-400">
                          {[
                            formatDate(item.interviewDate),
                            formatTime(item.startTime),
                            item.durationMinutes ? `${item.durationMinutes} mins` : null,
                            item.outcome === "completed" ? null : outcomeOf(item.outcome).short,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${cardClass} p-6`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Recent payments</h2>
              <CardLink href="/vendor/payments">All payments</CardLink>
            </div>
            {recentPayments.length === 0 ? (
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-8 text-center">
                <Receipt className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-sm text-slate-400">No payments recorded yet.</p>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {recentPayments.map((payment) => (
                  <li key={payment.id} className="flex items-center gap-3 py-2.5">
                    <Avatar name={payment.panelistName} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {payment.panelistName}
                      </span>
                      <span className="block truncate text-xs text-slate-400">
                        {formatDate(payment.paidOn)}
                        {payment.mode ? ` · ${payment.mode}` : ""}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {formatCurrency(payment.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
