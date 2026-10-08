import { Banknote, Clock, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { revokeEntry } from "./actions";
import { AddEntryForm } from "@/components/add-entry-form";
import { EarningsChart } from "@/components/earnings-chart";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { SummaryCard } from "@/components/summary-card";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InterviewEntry } from "@/lib/types";

function buildMonthlySeries(entries: InterviewEntry[]) {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    if (entry.status !== "approved" && entry.status !== "paid") continue;
    if (!entry.amount) continue;
    const monthKey = entry.interview_date.slice(0, 7); // yyyy-mm
    totals.set(monthKey, (totals.get(monthKey) ?? 0) + entry.amount);
  }

  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([monthKey, amount]) => ({
      label: new Date(`${monthKey}-01`).toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      }),
      amount,
    }));
}

export default async function PanelistDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: entries } = await supabase
    .from("interview_entries")
    .select("*")
    .eq("panelist_id", user!.id)
    .order("interview_date", { ascending: false })
    .returns<InterviewEntry[]>();

  const allEntries = entries ?? [];
  const amountDue = allEntries
    .filter((e) => e.status === "approved")
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const amountPaid = allEntries
    .filter((e) => e.status === "paid")
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const pendingReview = allEntries.filter((e) => e.status === "submitted").length;
  const chartData = buildMonthlySeries(allEntries);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Log interviews and track what you're owed."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Amount due"
          value={formatCurrency(amountDue)}
          icon={Wallet}
          accent="amber"
        />
        <SummaryCard
          label="Amount paid"
          value={formatCurrency(amountPaid)}
          icon={Banknote}
          accent="emerald"
        />
        <SummaryCard
          label="Awaiting review"
          value={String(pendingReview)}
          hint="Submitted but not yet approved"
          icon={Clock}
          accent="blue"
        />
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Log an interview
        </h2>
        <AddEntryForm />
      </section>

      {chartData.length > 0 ? (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Earnings by month
          </h2>
          <EarningsChart data={chartData} />
        </section>
      ) : null}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-6 py-4 text-sm font-semibold text-slate-900">
          My interviews
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-6 py-2.5">Date</th>
                <th className="px-6 py-2.5">Type</th>
                <th className="px-6 py-2.5">Status</th>
                <th className="px-6 py-2.5">Amount</th>
                <th className="px-6 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {allEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                    No interviews logged yet.
                  </td>
                </tr>
              ) : (
                allEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-3">{formatDate(entry.interview_date)}</td>
                    <td className="px-6 py-3">{entry.interview_type ?? "—"}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="px-6 py-3 font-medium tabular-nums">
                      {entry.amount ? formatCurrency(entry.amount) : "—"}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {entry.status === "submitted" ? (
                        <form action={revokeEntry.bind(null, entry.id)}>
                          <button
                            type="submit"
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Revoke
                          </button>
                        </form>
                      ) : null}
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
