import { outcomeOf } from "@/lib/interview-rates";

export function OutcomeLabel({ outcome }: { outcome: string }) {
  const { short, payoutPercent } = outcomeOf(outcome);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{short}</span>
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-500">
        {payoutPercent}%
      </span>
    </span>
  );
}
