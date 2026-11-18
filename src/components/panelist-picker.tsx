"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UserRound } from "lucide-react";

// Which panelist's dashboard to show, kept in the page address (?panelist=id).
export function PanelistPicker({
  panelists,
  value,
}: {
  panelists: { id: string; label: string }[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <UserRound className="h-4 w-4 text-slate-400" />
      <span className="sr-only">Panelist</span>
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(() => router.push(`${pathname}?panelist=${next}`, { scroll: false }));
        }}
        className={`max-w-64 bg-transparent font-medium text-slate-800 focus:outline-none ${pending ? "opacity-50" : ""}`}
      >
        {panelists.map((panelist) => (
          <option key={panelist.id} value={panelist.id}>
            {panelist.label}
          </option>
        ))}
      </select>
    </label>
  );
}
