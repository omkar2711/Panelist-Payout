"use client";

import { useActionState, useMemo, useState } from "react";
import { recordPayment } from "@/app/vendor/actions";
import { formatCurrency, formatDate } from "@/lib/format";

const initialState = { error: "" };
const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const labelClass = "text-sm font-medium text-slate-700";

export function RecordPaymentForm({
  panelists,
  approvedEntries,
}: {
  panelists: { id: string; full_name: string }[];
  approvedEntries: {
    id: string;
    panelist_id: string;
    interview_date: string;
    amount: number;
  }[];
}) {
  const [state, formAction, pending] = useActionState(recordPayment, initialState);
  const [panelistId, setPanelistId] = useState(panelists[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const entriesForPanelist = useMemo(
    () => approvedEntries.filter((e) => e.panelist_id === panelistId),
    [approvedEntries, panelistId],
  );

  const suggestedAmount = entriesForPanelist
    .filter((e) => selected.has(e.id))
    .reduce((sum, e) => sum + e.amount, 0);

  function toggleEntry(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="panelist_id" className={labelClass}>
          Panelist
        </label>
        <select
          id="panelist_id"
          name="panelist_id"
          value={panelistId}
          onChange={(e) => {
            setPanelistId(e.target.value);
            setSelected(new Set());
          }}
          className={inputClass}
        >
          {panelists.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <p className={labelClass}>Approved interviews to pay</p>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
          {entriesForPanelist.length === 0 ? (
            <p className="px-2 py-1 text-sm text-slate-400">
              Nothing approved and unpaid for this panelist.
            </p>
          ) : (
            entriesForPanelist.map((e) => (
              <label
                key={e.id}
                className="flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="entry_ids"
                    value={e.id}
                    checked={selected.has(e.id)}
                    onChange={() => toggleEntry(e.id)}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                  />
                  {formatDate(e.interview_date)}
                </span>
                <span className="text-slate-500">{formatCurrency(e.amount)}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="amount" className={labelClass}>
            Amount (₹)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min={0}
            key={suggestedAmount}
            defaultValue={suggestedAmount || undefined}
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="paid_on" className={labelClass}>
            Paid on
          </label>
          <input
            id="paid_on"
            name="paid_on"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="mode" className={labelClass}>
            Mode
          </label>
          <input id="mode" name="mode" type="text" placeholder="UPI / Bank transfer" className={inputClass} />
        </div>

        <div className="space-y-1">
          <label htmlFor="reference" className={labelClass}>
            Reference (optional)
          </label>
          <input id="reference" name="reference" type="text" className={inputClass} />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="notes" className={labelClass}>
          Notes (optional)
        </label>
        <textarea id="notes" name="notes" rows={2} className={inputClass} />
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending || entriesForPanelist.length === 0}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Recording..." : "Record payment"}
      </button>
    </form>
  );
}
