"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { monthLabel } from "@/lib/performance";

// "All time" or one month, kept in the page address (?period=yyyy-mm).
export function PeriodPicker({ months, value }: { months: string[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <CalendarDays className="h-4 w-4 text-slate-400" />
      <span className="sr-only">Show data for</span>
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(() =>
            router.push(next === "all" ? pathname : `${pathname}?period=${next}`, { scroll: false }),
          );
        }}
        className={`bg-transparent font-medium text-slate-800 focus:outline-none ${pending ? "opacity-50" : ""}`}
      >
        <option value="all">All time</option>
        {months.map((month) => (
          <option key={month} value={month}>
            {monthLabel(month)}
          </option>
        ))}
      </select>
    </label>
  );
}
