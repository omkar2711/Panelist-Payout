import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { RecordPaymentForm } from "@/components/record-payment-form";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InterviewEntry, Panelist, Payment, Profile } from "@/lib/types";

type PanelistRow = Panelist & { profiles: Pick<Profile, "full_name"> };
type PaymentRow = Payment & { panelists: { profiles: Pick<Profile, "full_name"> } };

export default async function PaymentsPage() {
  const supabase = await createClient();

  const [{ data: panelists }, { data: approvedEntries }, { data: payments }] =
    await Promise.all([
      supabase
        .from("panelists")
        .select("*, profiles(full_name)")
        .eq("active", true)
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
    ]);

  const panelistOptions = (panelists ?? []).map((p) => ({
    id: p.id,
    full_name: p.profiles.full_name,
  }));

  const entries = (approvedEntries ?? []).map((e) => ({
    ...e,
    amount: e.amount ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Pay panelists against approved interviews and see history."
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Record a payment
        </h2>
        {panelistOptions.length === 0 ? (
          <p className="text-sm text-slate-400">
            Add an active panelist first.
          </p>
        ) : (
          <RecordPaymentForm panelists={panelistOptions} approvedEntries={entries} />
        )}
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-6 py-4 text-sm font-semibold text-slate-900">
          Payment history
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-6 py-2.5">Panelist</th>
                <th className="px-6 py-2.5">Paid on</th>
                <th className="px-6 py-2.5">Mode</th>
                <th className="px-6 py-2.5">Amount</th>
              </tr>
            </thead>
            <tbody>
              {!payments || payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-slate-400">
                    No payments recorded yet.
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
                    <td className="px-6 py-3 font-medium tabular-nums">
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
  );
}
