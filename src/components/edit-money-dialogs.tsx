"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Pencil, X } from "lucide-react";
import {
  deleteReceipt,
  undoPayment,
  updatePayment,
  updateReceipt,
} from "@/app/vendor/actions";
import { formatCurrency } from "@/lib/format";

const initialState = { error: "", done: false };
const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const labelClass = "text-sm font-medium text-slate-700";

// A pencil button that opens a dialog, which closes itself once a save works.
function EditDialog({
  title,
  label,
  children,
  closeWhen,
}: {
  title: string;
  label: string;
  children: ReactNode;
  // The results of the dialog's two actions; a new successful one closes it.
  closeWhen: [{ done: boolean }, { done: boolean }];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [first, second] = closeWhen;
  useEffect(() => {
    if (first.done || second.done) dialog.current?.close();
  }, [first, second]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={label}
        title={label}
        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 print:hidden"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl p-0 text-left shadow-xl backdrop:bg-slate-900/40"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </dialog>
    </>
  );
}

// "Undo" or "Delete" that asks once more before doing it.
function ConfirmButton({
  action,
  id,
  label,
  confirmLabel,
  warning,
  pending,
}: {
  action: (formData: FormData) => void;
  id: string;
  label: string;
  confirmLabel: string;
  warning: string;
  pending: boolean;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        {label}
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <p className="text-xs text-red-700">{warning}</p>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? "Working..." : confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
      >
        Keep it
      </button>
    </form>
  );
}

export function EditPaymentButton({
  payment,
  panelistName,
  interviewCount,
}: {
  payment: {
    id: string;
    amount: number;
    tds_amount: number;
    recovery_amount: number;
    adjustment_amount?: number;
    paid_in_full: boolean;
    paid_on: string;
    mode: string | null;
    reference: string | null;
    notes: string | null;
  };
  panelistName: string;
  interviewCount: number;
}) {
  const [saveState, save, saving] = useActionState(updatePayment, initialState);
  const [undoState, undo, undoing] = useActionState(undoPayment, initialState);
  const gross =
    payment.amount + payment.tds_amount + payment.recovery_amount + (payment.adjustment_amount ?? 0);
  const worked = gross - payment.tds_amount - payment.recovery_amount;
  const error = saveState.error || undoState.error;

  return (
    <EditDialog
      title={`Payment to ${panelistName}`}
      label="Edit this payment"
      closeWhen={[saveState, undoState]}
    >
      <form
        // Remount after a save so the fields show the stored values.
        key={`${payment.amount}|${payment.paid_on}|${payment.mode}|${payment.reference}|${payment.notes}`}
        action={save}
        className="space-y-4"
      >
        <input type="hidden" name="id" value={payment.id} />
        <div className="space-y-1">
          <label htmlFor={`amount-${payment.id}`} className={labelClass}>
            Amount paid (₹)
          </label>
          <input
            id={`amount-${payment.id}`}
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={payment.amount}
            className={`${inputClass} tabular-nums`}
          />
          <p className="text-xs text-slate-500">
            {payment.paid_in_full
              ? "Paid in full before the 10% deduction started; 10% of this is recovered from later payouts."
              : `${interviewCount} interview${interviewCount === 1 ? "" : "s"} worth ${formatCurrency(gross)}${
                  payment.tds_amount ? `, less ${formatCurrency(payment.tds_amount)} deduction` : ""
                }${payment.recovery_amount ? ` and ${formatCurrency(payment.recovery_amount)} September adjustment` : ""}: ${formatCurrency(worked)} worked out. Any difference is kept as an adjustment.`}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor={`paid_on-${payment.id}`} className={labelClass}>
              Paid on
            </label>
            <input
              id={`paid_on-${payment.id}`}
              name="paid_on"
              type="date"
              required
              defaultValue={payment.paid_on}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`mode-${payment.id}`} className={labelClass}>
              Mode
            </label>
            <input
              id={`mode-${payment.id}`}
              name="mode"
              type="text"
              defaultValue={payment.mode ?? ""}
              placeholder="UPI / Bank transfer"
              className={inputClass}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor={`reference-${payment.id}`} className={labelClass}>
            Reference
          </label>
          <input
            id={`reference-${payment.id}`}
            name="reference"
            type="text"
            defaultValue={payment.reference ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`notes-${payment.id}`} className={labelClass}>
            Notes
          </label>
          <textarea
            id={`notes-${payment.id}`}
            name="notes"
            rows={2}
            defaultValue={payment.notes ?? ""}
            className={inputClass}
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      {payment.paid_in_full ? null : (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs text-slate-500">
            Wrong panelist or interviews? Undo the payment and record it again.
          </p>
          <ConfirmButton
            action={undo}
            id={payment.id}
            label="Undo this payment"
            confirmLabel="Yes, undo it"
            warning="Its interviews go back to approved and unpaid."
            pending={undoing}
          />
        </div>
      )}
    </EditDialog>
  );
}

export function EditReceiptButton({
  receipt,
}: {
  receipt: {
    id: string;
    amount: number;
    received_on: string;
    period_label: string | null;
    notes: string | null;
  };
}) {
  const [saveState, save, saving] = useActionState(updateReceipt, initialState);
  const [deleteState, remove, removing] = useActionState(deleteReceipt, initialState);
  const error = saveState.error || deleteState.error;

  return (
    <EditDialog title="Money received from NxtWave" label="Edit this receipt" closeWhen={[saveState, deleteState]}>
      <form
        key={`${receipt.amount}|${receipt.received_on}|${receipt.period_label}|${receipt.notes}`}
        action={save}
        className="space-y-4"
      >
        <input type="hidden" name="id" value={receipt.id} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor={`r-amount-${receipt.id}`} className={labelClass}>
              Amount received (₹)
            </label>
            <input
              id={`r-amount-${receipt.id}`}
              name="amount"
              type="number"
              min={0.01}
              step="0.01"
              required
              defaultValue={receipt.amount}
              className={`${inputClass} tabular-nums`}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`r-date-${receipt.id}`} className={labelClass}>
              Received on
            </label>
            <input
              id={`r-date-${receipt.id}`}
              name="received_on"
              type="date"
              required
              defaultValue={receipt.received_on}
              className={inputClass}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor={`r-for-${receipt.id}`} className={labelClass}>
            For
          </label>
          <input
            id={`r-for-${receipt.id}`}
            name="period_label"
            type="text"
            defaultValue={receipt.period_label ?? ""}
            placeholder="e.g. Oct 2026"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`r-notes-${receipt.id}`} className={labelClass}>
            Notes
          </label>
          <textarea
            id={`r-notes-${receipt.id}`}
            name="notes"
            rows={2}
            defaultValue={receipt.notes ?? ""}
            className={inputClass}
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <ConfirmButton
          action={remove}
          id={receipt.id}
          label="Delete this receipt"
          confirmLabel="Yes, delete it"
          warning="It comes off the cash position and the statement."
          pending={removing}
        />
      </div>
    </EditDialog>
  );
}
