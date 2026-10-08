"use client";

import dynamic from "next/dynamic";
import type { EarningPoint } from "./earnings-explorer";

// Browser-only: the chart buckets depend on the viewer's own date and remembered view.
const EarningsExplorer = dynamic(
  () => import("./earnings-explorer").then((mod) => mod.EarningsExplorer),
  {
    ssr: false,
    loading: () => <div className="h-[19.5rem] animate-pulse rounded-xl bg-slate-50" />,
  },
);

export function EarningsExplorerLoader({ points }: { points: EarningPoint[] }) {
  return <EarningsExplorer points={points} />;
}
