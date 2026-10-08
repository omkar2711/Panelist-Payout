"use client";

import { useActionState } from "react";
import { recordReceipt } from "@/app/vendor/actions";
import { formatCurrency } from "@/lib/format";

const initialState = { error: "", saved: 0 };
const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const labelClass = "text-sm font-medium text-slate-700";

export function ReceiptForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(recordReceipt, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <label htmlFor="receipt_amount" className={labelClass}>
          Amount received (₹)
        </label>
        <input
          id="receipt_amount"
          name="amount"
          type="number"
          min={1}
          step="any"
          required
          className={`${inputClass} tabular-nums`}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="received_on" className={labelClass}>
          Received on
        </label>
        <input
          id="received_on"
          name="received_on"
          type="date"
          required
          defaultValue={today}
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="period_label" className={labelClass}>
          For (optional)
        </label>
        <input
          id="period_label"
          name="period_label"
          type="text"
          placeholder="e.g. September 2026, INV-004"
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="receipt_notes" className={labelClass}>
          Notes (optional)
        </label>
        <input id="receipt_notes" name="notes" type="text" className={inputClass} />
      </div>

      {state.error ? (
        <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>
      ) : state.saved ? (
        <p className="text-sm text-emerald-700 sm:col-span-2">
          Recorded {formatCurrency(state.saved)} received.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 sm:col-span-2"
      >
        {pending ? "Saving..." : "Record receipt"}
      </button>
    </form>
  );
}
