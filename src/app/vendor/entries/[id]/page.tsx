import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EditEntryForm } from "@/components/edit-entry-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InterviewEntry, Profile } from "@/lib/types";

type Row = InterviewEntry & { panelists: { profiles: Pick<Profile, "full_name"> } };

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("interview_entries")
    .select("*, panelists(profiles(full_name))")
    .eq("id", id)
    .maybeSingle<Row>();

  if (!entry) notFound();

  const panelistName = entry.panelists.profiles.full_name;

  return (
    <div>
      <Link
        href="/vendor/entries"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to approvals
      </Link>

      <PageHeader
        title="Edit interview entry"
        description={`Logged by ${panelistName} for ${formatDate(entry.interview_date)}.`}
      />

      <section className="max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        {entry.status === "paid" ? (
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Lock className="h-4 w-4" />
            </span>
            <div className="space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2 font-medium text-slate-900">
                This entry is locked <StatusBadge status={entry.status} />
              </p>
              <p>
                It was paid{entry.amount ? ` (${formatCurrency(entry.amount)})` : ""} and
                is tied to a recorded payment, so it can&apos;t be edited or deleted.
              </p>
            </div>
          </div>
        ) : (
          <EditEntryForm entry={entry} />
        )}
      </section>
    </div>
  );
}
