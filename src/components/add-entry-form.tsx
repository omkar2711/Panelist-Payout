"use client";

import { useActionState } from "react";
import { addEntry } from "@/app/panelist/actions";
import { INTERVIEW_DURATIONS, INTERVIEW_OUTCOMES } from "@/lib/interview-rates";

const initialState = { error: "" };
const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const labelClass = "text-sm font-medium text-slate-700";

function Required() {
  return (
    <span className="text-red-500" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

export function AddEntryForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(addEntry, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <label htmlFor="interview_date" className={labelClass}>
          Date
          <Required />
        </label>
        <input
          id="interview_date"
          name="interview_date"
          type="date"
          required
          max={today}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="start_time" className={labelClass}>
          Start time
          <Required />
        </label>
        <input
          id="start_time"
          name="start_time"
          type="time"
          required
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="duration_minutes" className={labelClass}>
          Scheduled duration
          <Required />
        </label>
        <select
          id="duration_minutes"
          name="duration_minutes"
          required
          defaultValue={INTERVIEW_DURATIONS[0].minutes}
          className={inputClass}
        >
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
          placeholder="e.g. Technical Round 1"
          className={inputClass}
        />
      </div>

      <p className="text-xs text-slate-400 sm:col-span-2">
        Scheduled duration is the slot that was booked, not how long the interview
        actually ran.
      </p>

      <div className="space-y-1 sm:col-span-2">
        <label htmlFor="outcome" className={labelClass}>
          Interview status
          <Required />
        </label>
        <select id="outcome" name="outcome" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Choose what happened
          </option>
          {INTERVIEW_OUTCOMES.map((outcome) => (
            <option key={outcome.id} value={outcome.id}>
              {outcome.label} — {outcome.payoutPercent}% payment
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1 sm:col-span-2">
        <label htmlFor="candidate_ref" className={labelClass}>
          Candidate reference (optional)
        </label>
        <input
          id="candidate_ref"
          name="candidate_ref"
          type="text"
          placeholder="Candidate name or ID"
          className={inputClass}
        />
      </div>

      <div className="space-y-1 sm:col-span-2">
        <label htmlFor="notes" className={labelClass}>
          Notes (optional)
        </label>
        <textarea id="notes" name="notes" rows={2} className={inputClass} />
      </div>

      {state.error ? (
        <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>
      ) : null}

      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:col-span-2">
        Your logged interview will be matched with the data provided by NxtWave&apos;s team,
        and then the vendor will approve it.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 sm:col-span-2"
      >
        {pending ? "Adding..." : "Add interview"}
      </button>
    </form>
  );
}
