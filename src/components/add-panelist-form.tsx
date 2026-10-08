"use client";

import { useActionState } from "react";
import { addPanelist } from "@/app/vendor/actions";

const initialState = { error: "", tempPassword: "", email: "" };
const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const labelClass = "text-sm font-medium text-slate-700";

export function AddPanelistForm() {
  const [state, formAction, pending] = useActionState(addPanelist, initialState);

  return (
    <div className="space-y-4">
      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="full_name" className={labelClass}>
            Full name
          </label>
          <input id="full_name" name="full_name" type="text" required className={inputClass} />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>

        <div className="space-y-1">
          <label htmlFor="phone" className={labelClass}>
            Phone (optional)
          </label>
          <input id="phone" name="phone" type="tel" className={inputClass} />
        </div>

        <div className="space-y-1">
          <label htmlFor="default_rate" className={labelClass}>
            Rate per interview (₹)
          </label>
          <input
            id="default_rate"
            name="default_rate"
            type="number"
            min={0}
            step="1"
            required
            className={inputClass}
          />
        </div>

        {state.error ? (
          <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 sm:col-span-2"
        >
          {pending ? "Adding..." : "Add panelist"}
        </button>
      </form>

      {state.tempPassword ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Account created for <strong>{state.email}</strong>. Share this
          one-time temporary password with them so they can sign in and
          change it:
          <div className="mt-2 rounded bg-white px-3 py-2 font-mono text-sm">
            {state.tempPassword}
          </div>
        </div>
      ) : null}
    </div>
  );
}
