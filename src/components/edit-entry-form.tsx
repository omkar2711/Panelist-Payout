"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { deleteEntry, updateEntry } from "@/app/vendor/actions";
import {
  INTERVIEW_DURATIONS,
  INTERVIEW_OUTCOMES,
  isOfferedDuration,
} from "@/lib/interview-rates";
import type { InterviewEntry } from "@/lib/types";

const initialState = { error: "" };
const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const labelClass = "text-sm font-medium text-slate-700";

export function EditEntryForm({ entry }: { entry: InterviewEntry }) {
  const [state, formAction, pending] = useActionState(updateEntry, initialState);
  const [status, setStatus] = useState(entry.status);
  const [amount, setAmount] = useState(entry.amount === null ? "" : String(entry.amount));
  const [recalculating, setRecalculating] = useState(false);

  // Changing the slot or the interview status changes what's owed, so drop any
  // amount shown and let it be worked out again on save.
  function recalculateAmount() {
    setAmount("");
    setRecalculating(true);
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={entry.id} />

        <div className="space-y-1">
          <label htmlFor="interview_date" className={labelClass}>
            Date
          </label>
          <input
            id="interview_date"
            name="interview_date"
            type="date"
            required
            defaultValue={entry.interview_date}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="start_time" className={labelClass}>
            Start time
          </label>
          <input
            id="start_time"
            name="start_time"
            type="time"
            defaultValue={entry.start_time?.slice(0, 5) ?? ""}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="duration_minutes" className={labelClass}>
            Scheduled duration
          </label>
          <select
            id="duration_minutes"
            name="duration_minutes"
            defaultValue={entry.duration_minutes ?? ""}
            onChange={recalculateAmount}
            className={inputClass}
          >
            {entry.duration_minutes === null ? <option value="">Not recorded</option> : null}
            {entry.duration_minutes !== null && !isOfferedDuration(entry.duration_minutes) ? (
              <option value={entry.duration_minutes}>{entry.duration_minutes} mins</option>
            ) : null}
            {INTERVIEW_DURATIONS.map((duration) => (
              <option key={duration.minutes} value={duration.minutes}>
                {duration.minutes} mins
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="interview_type" className={labelClass}>
            Interview type
          </label>
          <input
            id="interview_type"
            name="interview_type"
            type="text"
            defaultValue={entry.interview_type ?? ""}
            className={inputClass}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="outcome" className={labelClass}>
            Interview status
          </label>
          <select
            id="outcome"
            name="outcome"
            defaultValue={entry.outcome}
            onChange={recalculateAmount}
            className={inputClass}
          >
            {INTERVIEW_OUTCOMES.map((outcome) => (
              <option key={outcome.id} value={outcome.id}>
                {outcome.label} — {outcome.payoutPercent}% payment
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="candidate_ref" className={labelClass}>
            Candidate reference
          </label>
          <input
            id="candidate_ref"
            name="candidate_ref"
            type="text"
            defaultValue={entry.candidate_ref ?? ""}
            className={inputClass}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={entry.notes ?? ""}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="status" className={labelClass}>
            Approval
          </label>
          <select
            id="status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as InterviewEntry["status"])}
            className={inputClass}
          >
            <option value="submitted">Submitted (awaiting approval)</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {status === "approved" ? (
          <div className="space-y-1">
            <label htmlFor="amount" className={labelClass}>
              Amount (₹)
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              min={0}
              step="any"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setRecalculating(false);
              }}
              placeholder="Worked out on save"
              className={`${inputClass} tabular-nums`}
            />
            <p className={`text-xs ${recalculating ? "text-amber-700" : "text-slate-400"}`}>
              {recalculating
                ? "Cleared because the slot or interview status changed. It will be recalculated on save, or type an amount."
                : "Leave blank to use the panelist's rate for this slot and interview status."}
            </p>
          </div>
        ) : (
          <p className="self-end pb-2 text-xs text-slate-400">
            No amount is owed unless the entry is approved.
          </p>
        )}

        {state.error ? (
          <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>
        ) : null}

        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save changes"}
          </button>
          <Link
            href="/vendor/entries"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>

      <form
        action={deleteEntry.bind(null, entry.id)}
        onSubmit={(event) => {
          if (!window.confirm("Delete this entry permanently? This can't be undone.")) {
            event.preventDefault();
          }
        }}
        className="flex items-center justify-between gap-4 border-t border-slate-200 pt-5"
      >
        <p className="text-sm text-slate-500">
          Remove this entry completely. The panelist will no longer see it.
        </p>
        <button
          type="submit"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete entry
        </button>
      </form>
    </div>
  );
}
