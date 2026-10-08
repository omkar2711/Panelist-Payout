const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Axis labels for a run of "yyyy-mm" keys: "Jun 26", "Jul", "Aug" ... with the
// year repeated only on the first label and each January, so they stay short.
export function monthAxisLabel(monthKey: string, index: number) {
  const date = new Date(`${monthKey}-01`);
  const month = date.toLocaleDateString("en-IN", { month: "short" });
  if (index > 0 && date.getMonth() !== 0) return month;
  return `${month} ${String(date.getFullYear()).slice(2)}`;
}

// "14:30:00" (how Postgres returns a time column) -> "2:30 PM"
export function formatTime(time: string | null) {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const period = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${period}`;
}
