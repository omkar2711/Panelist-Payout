"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { NOTICE_COOKIE } from "@/lib/notices";

export function NoticeBanner({ id, title, body }: { id: string; title: string; body: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  const close = () => {
    // A cookie rather than browser storage, so the server leaves the notice out
    // next time instead of flashing it on every page load.
    document.cookie = `${NOTICE_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
  };

  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 py-3 pl-4 pr-2 text-sm text-amber-900 shadow-sm sm:pl-5"
    >
      <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600" strokeWidth={2.25} />
      <p className="flex-1">
        <span className="font-semibold">{title}.</span> {body}
      </p>
      <button
        type="button"
        onClick={close}
        aria-label="Close this notice"
        className="-my-1 shrink-0 rounded-lg p-1.5 text-amber-700 hover:bg-amber-100 hover:text-amber-900"
      >
        <X className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </div>
  );
}
