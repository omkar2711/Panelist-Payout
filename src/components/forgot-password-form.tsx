"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { requestPasswordReset } from "@/app/login/actions";
import { authInputClass } from "@/components/password-input";

const initialState = { error: "", sentTo: "" };

function BackToSignIn() {
  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to sign in
    </Link>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state.sentTo) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <MailCheck className="h-6 w-6 text-emerald-600" />
          <p className="mt-3 text-sm font-semibold text-slate-900">Check your inbox</p>
          <p className="mt-1 text-sm text-slate-600">
            If <span className="font-medium text-slate-900">{state.sentTo}</span> has an
            account, a link to set a new password is on its way. It can take a minute, so
            check your spam folder too.
          </p>
        </div>
        <BackToSignIn />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={authInputClass}
          />
        </div>

        {state.error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-60"
        >
          {pending ? "Sending..." : "Email me a reset link"}
        </button>
      </form>
      <BackToSignIn />
    </div>
  );
}
