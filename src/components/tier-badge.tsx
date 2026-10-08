import { Award } from "lucide-react";
import type { TierId } from "@/lib/performance";

const STYLES: Record<TierId, string> = {
  starter: "bg-slate-100 text-slate-600",
  bronze: "bg-orange-100 text-orange-800",
  silver: "bg-slate-200 text-slate-700",
  gold: "bg-amber-100 text-amber-800",
  platinum: "bg-indigo-100 text-indigo-700",
};

export function TierBadge({
  tier,
  size = "sm",
}: {
  tier: { id: TierId; label: string };
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${STYLES[tier.id]} ${
        size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
      }`}
    >
      <Award className={size === "lg" ? "h-4 w-4" : "h-3 w-3"} strokeWidth={2.25} />
      {tier.label}
    </span>
  );
}
