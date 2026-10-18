import { monthLabel } from "@/lib/performance";

// The time window a vendor page is showing: one calendar month ("yyyy-mm") or
// everything. It travels in the page address as ?period=yyyy-mm.
export type Period = { key: string; isAll: boolean; label: string };

export const ALL_TIME: Period = { key: "all", isAll: true, label: "All time" };

export function parsePeriod(value: string | string[] | undefined): Period {
  if (typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return { key: value, isAll: false, label: monthLabel(value) };
  }
  return ALL_TIME;
}

// Whether a "yyyy-mm-dd" date falls inside the period.
export function inPeriod(period: Period, date: string | null | undefined) {
  return period.isAll || (date ?? "").startsWith(period.key);
}

// Every month from the earliest one with data up to the current month, newest first.
export function monthsSince(earliestDate: string | null | undefined, today: string) {
  const last = today.slice(0, 7);
  let [year, month] = (earliestDate ?? today).slice(0, 7).split("-").map(Number);
  const months: string[] = [];
  for (let key = ""; key < last; ) {
    key = `${year}-${String(month).padStart(2, "0")}`;
    months.push(key);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months.reverse();
}

// The PostgREST range for a month: interview_date >= from and < to.
export function monthRange(period: Period) {
  if (period.isAll) return null;
  const [year, month] = period.key.split("-").map(Number);
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  return { from: `${period.key}-01`, to: `${next}-01` };
}
