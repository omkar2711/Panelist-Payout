"use client";

import { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";

// A small spinner inside a <Link> while its page is loading, so a click is
// acknowledged at once without holding the finished page back.
export function LinkPending({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <LoaderCircle
      aria-label="Loading"
      className={`h-3.5 w-3.5 shrink-0 animate-spin text-blue-500 ${className}`}
    />
  ) : null;
}
