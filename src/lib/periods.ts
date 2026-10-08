import { monthAxisLabel } from "@/lib/format";

export type Granularity = "day" | "week" | "month";
export type Period = { start: Date; end: Date; label: string; tooltip: string };

export const DEFAULT_PERIODS: Record<Granularity, number> = { day: 14, week: 8, month: 6 };

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function parseLocalDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dayMonth(date: Date) {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function monthYear(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function mondayOf(date: Date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

// How many day / week / month periods it takes to cover from..to inclusive.
export function periodsBetween(granularity: Granularity, from: Date, to: Date) {
  if (to < from) return 1;
  if (granularity === "day") {
    return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  }
  if (granularity === "week") {
    return Math.round((mondayOf(to).getTime() - mondayOf(from).getTime()) / (7 * 86_400_000)) + 1;
  }
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
}

// `count` consecutive periods ending with the one that contains `endDate`.
// Weeks run Monday to Sunday.
export function buildPeriods(
  granularity: Granularity,
  endDate: Date,
  count = DEFAULT_PERIODS[granularity],
): Period[] {
  if (granularity === "day") {
    return Array.from({ length: count }, (_, i) => {
      const date = addDays(endDate, i - (count - 1));
      return {
        start: date,
        end: date,
        // Day number only; subtitles and tooltips carry the month.
        label: String(date.getDate()),
        tooltip: date.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      };
    });
  }

  if (granularity === "week") {
    const monday = mondayOf(endDate);
    return Array.from({ length: count }, (_, i) => {
      const start = addDays(monday, (i - (count - 1)) * 7);
      const end = addDays(start, 6);
      return {
        start,
        end,
        label: dayMonth(start),
        tooltip: `${dayMonth(start)} – ${dayMonth(end)}`,
      };
    });
  }

  return Array.from({ length: count }, (_, i) => {
    const start = new Date(endDate.getFullYear(), endDate.getMonth() + i - (count - 1), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    return {
      start,
      end,
      label: monthAxisLabel(monthKey, i),
      tooltip: start.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    };
  });
}
