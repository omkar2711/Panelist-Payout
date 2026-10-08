"use client";

import dynamic from "next/dynamic";

// The builder restores its draft from localStorage, so it must only render in the browser.
const InvoiceBuilder = dynamic(
  () => import("./invoice-builder").then((mod) => mod.InvoiceBuilder),
  {
    ssr: false,
    loading: () => <p className="text-sm text-slate-400">Loading invoice…</p>,
  },
);

export function InvoiceLoader() {
  return <InvoiceBuilder />;
}
