import { Avatar } from "@/components/avatar";
import { TierBadge } from "@/components/tier-badge";
import { formatDate } from "@/lib/format";
import { RECENT_DAYS, type PanelistStats } from "@/lib/performance";

export type Scorecard = {
  id: string;
  name: string;
  active: boolean;
  pending: number;
  stats: PanelistStats;
};

function strikeText(strikes: PanelistStats["reliability"]["strikes"]) {
  const parts = [
    strikes.noShow ? `${strikes.noShow} no-show` : "",
    strikes.wrong ? `${strikes.wrong} wrong` : "",
    strikes.rejected ? `${strikes.rejected} rejected` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "None";
}

export function Scorecards({ cards }: { cards: Scorecard[] }) {
  const th = "px-4 py-2.5 first:pl-6 last:pr-6";
  const td = "px-4 py-3 first:pl-6 last:pr-6";

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Panelist scorecards</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Volume, reliability and recent activity for every panelist. Reliability and strikes
          cover the last {RECENT_DAYS} days.
        </p>
      </div>
      {cards.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-slate-400">No panelists yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className={th}>Panelist</th>
                <th className={`${th} text-right`}>This month</th>
                <th className={`${th} text-right`}>Last month</th>
                <th className={`${th} text-right`}>{RECENT_DAYS} days</th>
                <th className={`${th} text-right`}>Awaiting</th>
                <th className={`${th} text-right`}>Reliability</th>
                <th className={th}>Strikes</th>
                <th className={`${th} text-right`}>Streak</th>
                <th className={th}>Last interview</th>
              </tr>
            </thead>
            <tbody>
              {cards.map(({ id, name, active, pending, stats }) => (
                <tr
                  key={id}
                  className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                >
                  <td className={td}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Avatar name={name} />
                      <span className="font-medium text-slate-800">{name}</span>
                      <TierBadge tier={stats.tier} />
                      {active ? null : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          Inactive
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`${td} text-right font-semibold tabular-nums text-slate-900`}>
                    {stats.thisMonth.count}
                  </td>
                  <td className={`${td} text-right tabular-nums text-slate-600`}>
                    {stats.lastMonth.count}
                  </td>
                  <td className={`${td} text-right tabular-nums text-slate-600`}>
                    {stats.recentCount}
                  </td>
                  <td className={`${td} text-right tabular-nums text-slate-600`}>{pending}</td>
                  <td className={`${td} text-right tabular-nums`}>
                    {stats.reliability.percent === null ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span
                        className={
                          stats.reliability.percent < 90
                            ? "font-semibold text-red-600"
                            : "font-semibold text-slate-900"
                        }
                      >
                        {stats.reliability.percent}%
                      </span>
                    )}
                  </td>
                  <td
                    className={`${td} whitespace-nowrap ${
                      stats.reliability.strikeTotal ? "text-red-700" : "text-slate-400"
                    }`}
                  >
                    {strikeText(stats.reliability.strikes)}
                  </td>
                  <td className={`${td} whitespace-nowrap text-right tabular-nums text-slate-600`}>
                    {stats.streak.current} wk
                  </td>
                  <td className={`${td} whitespace-nowrap text-slate-600`}>
                    {stats.lastInterview ? formatDate(stats.lastInterview) : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
