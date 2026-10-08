"use client";

import dynamic from "next/dynamic";
import type { InterviewRow } from "./interview-explorer";

// Browser-only: the activity view is bucketed relative to the viewer's own date.
const InterviewExplorer = dynamic(
  () => import("./interview-explorer").then((mod) => mod.InterviewExplorer),
  {
    ssr: false,
    loading: () => <p className="text-sm text-slate-400">Loading interviews…</p>,
  },
);

export function InterviewExplorerLoader(props: {
  rows: InterviewRow[];
  panelists: { id: string; name: string }[];
}) {
  return <InterviewExplorer {...props} />;
}
