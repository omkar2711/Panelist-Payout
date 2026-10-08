"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheckBig, LinkIcon } from "lucide-react";
import { PasswordInput } from "@/components/password-input";
import { createClient } from "@/lib/supabase/client";

const MIN_LENGTH = 8;

type Stage = "checking" | "ready" | "invalid" | "done";
type LinkDetails = { accessToken: string | null; refreshToken: string | null; failed: boolean };

function readResetLink(): LinkDetails {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return {
    accessToken: hash.get("access_token"),
    refreshToken: hash.get("refresh_token"),
    failed: hash.has("error") || hash.has("error_code"),
  };
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("checking");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const link = useRef<LinkDetails | null>(null);

  useEffect(() => {
    // Read the emailed link's tokens once and take them out of the address bar
    // before anything else looks at the URL.
    if (!link.current) {
      link.current = readResetLink();
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
    const { accessToken, refreshToken, failed } = link.current;
    let cancelled = false;

    async function openSession() {
      const supabase = createClient();
      if (failed) {
        if (!cancelled) setStage("invalid");
        return;
      }
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!cancelled) setStage(sessionError ? "invalid" : "ready");
        return;
      }
      // No link in the URL: allow it for someone who is already signed in.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled) setStage(user ? "ready" : "invalid");
    }

    openSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setError("");
    setSaving(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(
        updateError.code === "same_password"
          ? "That's your current password. Choose a different one."
          : updateError.message,
      );
      return;
    }

    setStage("done");
    router.replace("/");
    router.refresh();
  }

  if (stage === "checking") {
    return <p className="text-sm text-slate-500">Checking your link...</p>;
  }

  if (stage === "invalid") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <LinkIcon className="h-6 w-6 text-amber-600" />
          <p className="mt-3 text-sm font-semibold text-slate-900">
            This link has expired or was already used
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Reset links work once and only for a short time. Request a fresh one and use
            it straight away.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <CircleCheckBig className="h-6 w-6 text-emerald-600" />
        <p className="mt-3 text-sm font-semibold text-slate-900">Password updated</p>
        <p className="mt-1 text-sm text-slate-600">Taking you to your dashboard...</p>
      </div>
    );
  }

  return (
    <form onSubmit={savePassword} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          New password
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={MIN_LENGTH}
        />
        <p className="text-xs text-slate-400">At least {MIN_LENGTH} characters.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm" className="text-sm font-medium text-slate-700">
          Confirm new password
        </label>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          minLength={MIN_LENGTH}
        />
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Set new password"}
      </button>
    </form>
  );
}
