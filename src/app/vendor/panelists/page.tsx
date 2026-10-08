import { createClient } from "@/lib/supabase/server";
import { AddPanelistForm } from "@/components/add-panelist-form";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { updateRates, togglePanelistActive } from "@/app/vendor/actions";
import type { Panelist, Profile } from "@/lib/types";

type Row = Panelist & { profiles: Pick<Profile, "full_name" | "email"> };

export default async function PanelistsPage() {
  const supabase = await createClient();

  const { data: panelists } = await supabase
    .from("panelists")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  const rows = panelists ?? [];

  return (
    <div>
      <PageHeader
        title="Panelists"
        description="Add panelists, set their per-interview rate, and manage access."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm xl:col-span-4 xl:self-start">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Add a panelist
          </h2>
          <AddPanelistForm />
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm xl:col-span-8 xl:self-start">
          <h2 className="border-b border-slate-100 px-6 py-4 text-sm font-semibold text-slate-900">
            All panelists
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-2.5">Name</th>
                  <th className="px-6 py-2.5">Email</th>
                  <th className="px-6 py-2.5">Payout rates</th>
                  <th className="px-6 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-center text-slate-400">
                      No panelists yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={p.profiles.full_name} />
                          <span className="font-medium text-slate-800">
                            {p.profiles.full_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-slate-500">{p.profiles.email}</td>
                      <td className="px-6 py-3">
                        <form action={updateRates} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="panelist_id" value={p.id} />
                          <label className="flex items-center gap-1.5 text-xs text-slate-500">
                            60 min ₹
                            <input
                              type="number"
                              name="rate_60"
                              defaultValue={p.rate_60}
                              min={0}
                              required
                              className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm tabular-nums focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-slate-500">
                            90 min ₹
                            <input
                              type="number"
                              name="rate_90"
                              defaultValue={p.rate_90}
                              min={0}
                              required
                              className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm tabular-nums focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </label>
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Save
                          </button>
                        </form>
                      </td>
                      <td className="px-6 py-3">
                        <form action={togglePanelistActive.bind(null, p.id, !p.active)}>
                          <button
                            type="submit"
                            className={
                              p.active
                                ? "inline-flex items-center gap-1.5 text-emerald-700 hover:underline"
                                : "inline-flex items-center gap-1.5 text-slate-400 hover:underline"
                            }
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${p.active ? "bg-emerald-500" : "bg-slate-300"}`}
                            />
                            {p.active ? "Active" : "Inactive"}
                          </button>
                        </form>
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
