"use client";

import { useActionState, useMemo, useState } from "react";
import { recordPayment } from "@/app/vendor/actions";
import { payoutBreakdown } from "@/lib/deductions";
import { formatCurrency, formatDate } from "@/lib/format";

const initialState = { error: "" };
const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const labelClass = "text-sm font-medium text-slate-700";

export function RecordPaymentForm({
  panelists,
  approvedEntries,
  recoverable,
}: {
  panelists: { id: string; full_name: string }[];
  // per panelist: what is still to be recovered from September's full payouts
  recoverable: Record<string, number>;
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
  const [deduct, setDeduct] = useState(true);
  const [recover, setRecover] = useState(true);
  const [useCustom, setUseCustom] = useState(false);
  const [custom, setCustom] = useState("");

  const entriesForPanelist = useMemo(
    () => approvedEntries.filter((e) => e.panelist_id === panelistId),
    [approvedEntries, panelistId],
  );
  const listedTotal = entriesForPanelist.reduce((sum, e) => sum + e.amount, 0);
  const ticked = entriesForPanelist.filter((e) => selected.has(e.id));
  const allTicked = entriesForPanelist.length > 0 && ticked.length === entriesForPanelist.length;

  const gross = ticked.reduce((sum, e) => sum + e.amount, 0);
  const toRecover = recoverable[panelistId] ?? 0;
  const customAmount =
    useCustom && custom.trim() !== "" && Number(custom) >= 0 ? Number(custom) : null;
  const payout = payoutBreakdown(gross, toRecover, { deduct, recover, customAmount });

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
            setUseCustom(false);
            setCustom("");
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
        <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200">
          {entriesForPanelist.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">
              Nothing approved and unpaid for this panelist.
            </p>
          ) : (
            <>
              <label className="sticky top-0 z-[1] flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allTicked}
                    ref={(box) => {
                      if (box) box.indeterminate = ticked.length > 0 && !allTicked;
                    }}
                    onChange={() =>
                      setSelected(
                        allTicked ? new Set() : new Set(entriesForPanelist.map((e) => e.id)),
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                  />
                  Select all ({entriesForPanelist.length})
                </span>
                <span className="tabular-nums text-slate-500">{formatCurrency(listedTotal)}</span>
              </label>
              <div className="space-y-1 p-2">
                {entriesForPanelist.map((e) => (
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
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-sm">
        <dl className="space-y-1.5 text-slate-600">
          <div className="flex justify-between gap-3">
            <dt>
              Ticked interviews <span className="text-slate-400">({ticked.length})</span>
            </dt>
            <dd className="tabular-nums">{formatCurrency(payout.gross)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="deduct"
                  checked={deduct}
                  onChange={(e) => setDeduct(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                />
                10% deduction
              </label>
            </dt>
            <dd className="tabular-nums">−{formatCurrency(payout.tds)}</dd>
          </div>
          {toRecover > 0 ? (
            <div className="flex justify-between gap-3">
              <dt>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="recover"
                    checked={recover}
                    onChange={(e) => setRecover(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                  />
                  <span>
                    September adjustment
                    <span className="text-slate-400"> ({formatCurrency(toRecover)} to recover)</span>
                  </span>
                </label>
              </dt>
              <dd className="tabular-nums">−{formatCurrency(payout.recovery)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3 border-t border-slate-200 pt-1.5">
            <dt>Worked-out amount</dt>
            <dd className="tabular-nums">{formatCurrency(payout.worked)}</dd>
          </div>
        </dl>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              name="use_custom"
              checked={useCustom}
              onChange={(e) => {
                setUseCustom(e.target.checked);
                if (e.target.checked && custom === "") setCustom(String(payout.worked));
              }}
              className="h-4 w-4 rounded border-slate-300 accent-blue-600"
            />
            Pay a different amount
          </label>
          {useCustom ? (
            <div className="space-y-1">
              <label htmlFor="custom_amount" className="sr-only">
                Amount paid (₹)
              </label>
              <input
                id="custom_amount"
                name="custom_amount"
                type="number"
                min={0}
                step="0.01"
                required
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className={`${inputClass} bg-white tabular-nums`}
              />
              {payout.adjustment !== 0 ? (
                <p className="text-xs text-amber-700">
                  {formatCurrency(Math.abs(payout.adjustment))}{" "}
                  {payout.adjustment > 0 ? "less" : "more"} than the worked-out amount. Add a
                  note below saying why; it stays on the statement.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-2">
          <span className="font-medium text-slate-800">Amount to pay</span>
          <span className="text-lg font-semibold tabular-nums text-slate-900">
            {formatCurrency(payout.net)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        disabled={pending || ticked.length === 0}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Recording..." : "Record payment"}
      </button>
    </form>
  );
}
