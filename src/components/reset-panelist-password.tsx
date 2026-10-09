"use client";

import { useActionState } from "react";
import { resetPanelistPassword } from "@/app/vendor/actions";

const initialState = { error: "", tempPassword: "" };

export function ResetPanelistPassword({
  panelistId,
  name,
}: {
  panelistId: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(resetPanelistPassword, initialState);

  return (
    <div className="space-y-2">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (
            !window.confirm(
              `Reset the password for ${name}? Their current password will stop working.`,
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="panelist_id" value={panelistId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {pending ? "Resetting..." : "Reset password"}
        </button>
      </form>

      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}

      {state.tempPassword ? (
        <div className="max-w-56 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          New one-time password. Share it with {name}:
          <div className="mt-1 select-all rounded bg-white px-2 py-1 font-mono text-sm">
            {state.tempPassword}
          </div>
        </div>
      ) : null}
    </div>
  );
}
