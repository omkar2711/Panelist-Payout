import Link from "next/link";
import { Banknote, CircleCheckBig, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { EarningsChart } from "@/components/earnings-chart";
import { PageHeader } from "@/components/page-header";
import { SummaryCard } from "@/components/summary-card";
import { formatCurrency } from "@/lib/format";
import type { PanelistBalance } from "@/lib/types";

export default async function VendorDashboard() {
  const supabase = await createClient();

  const { data: balances } = await supabase
    .from("panelist_balances")
    .select("*")
    .returns<PanelistBalance[]>();

  const rows = balances ?? [];
  const totalDue = rows.reduce((sum, r) => sum + r.amount_due, 0);
  const totalPaid = rows.reduce((sum, r) => sum + r.amount_paid, 0);
  const pendingReview = rows.reduce((sum, r) => sum + r.pending_review_count, 0);

  const chartData = rows
    .filter((r) => r.amount_due > 0)
    .sort((a, b) => b.amount_due - a.amount_due)
    .map((r) => ({ label: r.full_name.split(" ")[0], amount: r.amount_due }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of what's owed and what's been paid out."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total owed to panelists"
          value={formatCurrency(totalDue)}
          icon={Wallet}
          accent="amber"
        />
        <SummaryCard
          label="Total paid out"
          value={formatCurrency(totalPaid)}
          icon={Banknote}
          accent="emerald"
        />
        <SummaryCard
          label="Awaiting approval"
          value={String(pendingReview)}
          hint={pendingReview > 0 ? "Review in the Approvals tab" : undefined}
          icon={CircleCheckBig}
          accent="blue"
        />
      </div>

      {chartData.length > 0 ? (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Amount due by panelist
          </h2>
          <EarningsChart data={chartData} />
        </section>
      ) : null}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-6 py-4 text-sm font-semibold text-slate-900">
          Panelists
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-6 py-2.5">Name</th>
                <th className="px-6 py-2.5">Interviews</th>
                <th className="px-6 py-2.5">Due</th>
                <th className="px-6 py-2.5">Paid</th>
                <th className="px-6 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                    No panelists yet.{" "}
                    <Link href="/vendor/panelists" className="text-blue-600 hover:underline">
                      Add one
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.panelist_id}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.full_name} />
                        <span className="font-medium text-slate-800">{r.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 tabular-nums text-slate-600">
                      {r.approved_interview_count}
                    </td>
                    <td className="px-6 py-3 font-medium tabular-nums text-slate-900">
                      {formatCurrency(r.amount_due)}
                    </td>
                    <td className="px-6 py-3 tabular-nums text-slate-500">
                      {formatCurrency(r.amount_paid)}
                    </td>
                    <td className="px-6 py-3">
                      {r.active ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
