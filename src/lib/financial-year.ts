// India's financial year runs April to March; "FY 2026-27" starts on 1 April
// 2026. It travels in the page address as ?fy=2026 (or ?fy=all).
export type FinancialYear = {
  key: string;
  isAll: boolean;
  label: string;
  from: string;
  to: string;
};

export function financialYearOf(date: string) {
  const [year, month] = date.split("-").map(Number);
  return month >= 4 ? year : year - 1;
}

export function financialYear(start: number): FinancialYear {
  return {
    key: String(start),
    isAll: false,
    label: `FY ${start}-${String((start + 1) % 100).padStart(2, "0")}`,
    from: `${start}-04-01`,
    to: `${start + 1}-03-31`,
  };
}

export const ALL_YEARS: FinancialYear = {
  key: "all",
  isAll: true,
  label: "All time",
  from: "0000-01-01",
  to: "9999-12-31",
};

// The chosen year, defaulting to the current one.
export function parseFinancialYear(value: string | string[] | undefined, today: string) {
  if (value === "all") return ALL_YEARS;
  if (typeof value === "string" && /^\d{4}$/.test(value)) return financialYear(Number(value));
  return financialYear(financialYearOf(today));
}

// Every year from the earliest one with data to the current one, newest first.
export function financialYearsSince(earliestDate: string | undefined, today: string) {
  const years: FinancialYear[] = [];
  for (let start = financialYearOf(today); start >= financialYearOf(earliestDate ?? today); start--) {
    years.push(financialYear(start));
  }
  return years;
}
