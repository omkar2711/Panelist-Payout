"use client";

import { useActionState } from "react";
import { saveClientInvoice } from "@/app/vendor/actions";
import { monthLabel } from "@/lib/performance";

const initialState = { error: "", saved: "" };
const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const labelClass = "text-sm font-medium text-slate-700";

export function ClientInvoiceForm({ defaultMonth, today }: { defaultMonth: string; today: string }) {
  const [state, formAction, pending] = useActionState(saveClientInvoice, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <label htmlFor="invoice_month" className={labelClass}>
          For interviews in
        </label>
        <input
          id="invoice_month"
          name="month"
          type="month"
          required
          defaultValue={defaultMonth}
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="invoice_amount" className={labelClass}>
          Invoice total (₹)
        </label>
        <input
          id="invoice_amount"
          name="amount"
          type="number"
          min={0}
          step="any"
          required
          placeholder="Before NxtWave's TDS"
          className={`${inputClass} tabular-nums`}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="invoice_no" className={labelClass}>
          Invoice number (optional)
        </label>
        <input id="invoice_no" name="invoice_no" type="text" placeholder="e.g. INV-002" className={inputClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor="issued_on" className={labelClass}>
          Invoice date (optional)
        </label>
        <input id="issued_on" name="issued_on" type="date" defaultValue={today} className={inputClass} />
      </div>

      {state.error ? (
        <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>
      ) : state.saved ? (
        <p className="text-sm text-emerald-700 sm:col-span-2">
          Saved the invoice for {monthLabel(state.saved)}.
        </p>
      ) : (
        <p className="text-xs text-slate-400 sm:col-span-2">
          Saving a month again replaces its invoice. The dashboard uses this amount instead of its
          own estimate for that month.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 sm:col-span-2"
      >
        {pending ? "Saving..." : "Save invoice"}
      </button>
    </form>
  );
}
