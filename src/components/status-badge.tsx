import type { EntryStatus } from "@/lib/types";

const STYLES: Record<EntryStatus, { badge: string; dot: string }> = {
  submitted: { badge: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  approved: { badge: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  paid: { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  rejected: { badge: "bg-red-50 text-red-700", dot: "bg-red-500" },
};

export function StatusBadge({ status }: { status: EntryStatus }) {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}
