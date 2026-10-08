import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { approveEntry, rejectEntry } from "@/app/vendor/actions";
import { Avatar } from "@/components/avatar";
import { OutcomeLabel } from "@/components/outcome-label";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import type { InterviewEntry, Profile } from "@/lib/types";

type Row = InterviewEntry & { panelists: { profiles: Pick<Profile, "full_name"> } };

export default async function EntriesPage() {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("interview_entries")
    .select("*, panelists(profiles(full_name))")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  const rows = entries ?? [];
  const pending = rows.filter((e) => e.status === "submitted");
  const rest = rows.filter((e) => e.status !== "submitted");

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Review, edit or remove the interviews panelists have logged."
      />

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-6 py-4 text-sm font-semibold text-slate-900">
          Awaiting your approval ({pending.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-6 py-2.5">Panelist</th>
                <th className="px-6 py-2.5">Date &amp; time</th>
                <th className="px-6 py-2.5">Scheduled</th>
                <th className="px-6 py-2.5">Interview status</th>
                <th className="px-6 py-2.5">Type</th>
                <th className="px-6 py-2.5">Notes</th>
                <th className="px-6 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-center text-slate-400">
                    Nothing to review.
                  </td>
                </tr>
              ) : (
                pending.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={e.panelists.profiles.full_name} />
                        <span className="font-medium text-slate-800">
                          {e.panelists.profiles.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span className="block">{formatDate(e.interview_date)}</span>
                      <span className="block text-xs text-slate-400">
                        {formatTime(e.start_time) ?? "No time logged"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 tabular-nums">
                      {e.duration_minutes ? `${e.duration_minutes} mins` : "—"}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      <OutcomeLabel outcome={e.outcome} />
                    </td>
                    <td className="px-6 py-3">{e.interview_type ?? "—"}</td>
                    <td className="px-6 py-3 text-slate-500">{e.notes ?? "—"}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <form action={approveEntry.bind(null, e.id)}>
                          <button
                            type="submit"
                            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            Approve
                          </button>
                        </form>
                        <form action={rejectEntry.bind(null, e.id)}>
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Reject
                          </button>
                        </form>
                        <Link
                          href={`/vendor/entries/${e.id}`}
                          className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-6 py-4 text-sm font-semibold text-slate-900">
          History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-6 py-2.5">Panelist</th>
                <th className="px-6 py-2.5">Date &amp; time</th>
                <th className="px-6 py-2.5">Scheduled</th>
                <th className="px-6 py-2.5">Interview status</th>
                <th className="px-6 py-2.5">Approval</th>
                <th className="px-6 py-2.5">Amount</th>
                <th className="px-6 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rest.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-center text-slate-400">
                    No history yet.
                  </td>
                </tr>
              ) : (
                rest.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={e.panelists.profiles.full_name} />
                        <span className="font-medium text-slate-800">
                          {e.panelists.profiles.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span className="block">{formatDate(e.interview_date)}</span>
                      <span className="block text-xs text-slate-400">
                        {formatTime(e.start_time) ?? "No time logged"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 tabular-nums">
                      {e.duration_minutes ? `${e.duration_minutes} mins` : "—"}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      <OutcomeLabel outcome={e.outcome} />
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-6 py-3 tabular-nums">
                      {e.amount === null ? "—" : formatCurrency(e.amount)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {e.status === "paid" ? (
                        <span className="text-xs text-slate-400" title="Paid entries are locked">
                          Locked
                        </span>
                      ) : (
                        <Link
                            href={`/vendor/entries/${e.id}`}
                            className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </Link>
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
