"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Minus, Sparkles, Trophy } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { TierBadge } from "@/components/tier-badge";
import { tierFor } from "@/lib/performance";
import type { LeaderboardRow } from "@/lib/types";

type Metric = "month_count" | "approved_count" | "last_month_count";

const MEDALS: Record<number, string> = {
  1: "bg-amber-100 text-amber-800",
  2: "bg-slate-200 text-slate-700",
  3: "bg-orange-100 text-orange-800",
};

// Tied counts share a rank, and the next rank skips accordingly (1, 1, 3).
function rankBy(rows: LeaderboardRow[], metric: Metric) {
  const sorted = [...rows].sort(
    (a, b) => b[metric] - a[metric] || a.full_name.localeCompare(b.full_name),
  );
  let rank = 0;
  return sorted.map((row, index) => {
    if (index === 0 || row[metric] !== sorted[index - 1][metric]) rank = index + 1;
    return { ...row, rank, count: row[metric] };
  });
}

// This month's board, with each person's change in rank since last month.
function monthlyBoard(rows: LeaderboardRow[]) {
  const lastRanks = new Map(
    rankBy(rows, "last_month_count").map((row) => [row.panelist_id, row.rank]),
  );
  return rankBy(rows, "month_count").map((row) => ({
    ...row,
    // Only meaningful for someone who was on the board last month.
    moved: row.last_month_count > 0 ? (lastRanks.get(row.panelist_id) ?? row.rank) - row.rank : null,
  }));
}

function Movement({ moved, isNew }: { moved: number | null; isNew: boolean }) {
  if (isNew) {
    return <span className="text-xs font-medium text-blue-600">New</span>;
  }
  if (moved === null || moved === 0) {
    return <Minus className="h-3.5 w-3.5 text-slate-300" aria-label="No change" />;
  }
  const up = moved > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
        up ? "text-emerald-600" : "text-red-600"
      }`}
      title={`${up ? "Up" : "Down"} ${Math.abs(moved)} since last month`}
    >
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(moved)}
    </span>
  );
}

export function Leaderboard({
  rows,
  currentUserId,
}: {
  rows: LeaderboardRow[];
  currentUserId?: string;
}) {
  const [period, setPeriod] = useState<"month" | "all">("month");

  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white px-6 py-10 text-center shadow-sm">
        <Trophy className="mx-auto h-6 w-6 text-slate-300" />
        <p className="mt-2 text-sm text-slate-400">No panelists yet.</p>
      </section>
    );
  }

  const monthly = monthlyBoard(rows);
  const ranked =
    period === "month"
      ? monthly
      : rankBy(rows, "approved_count").map((row) => ({ ...row, moved: null }));
  const max = Math.max(1, ...ranked.map((row) => row.count));
  const improved = [...rows]
    .map((row) => ({ ...row, gain: row.month_count - row.last_month_count }))
    .filter((row) => row.gain > 0 && row.last_month_count > 0)
    .sort((a, b) => b.gain - a.gain)[0];

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            {period === "month" ? "This month" : "All time"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {period === "month"
              ? "Approved interviews this month. The board resets on the 1st."
              : "Every approved interview since the start."}
          </p>
        </div>
        <div role="group" aria-label="Period" className="inline-flex rounded-full bg-slate-100 p-1">
          {(
            [
              { id: "month", label: "This month" },
              { id: "all", label: "All time" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={period === option.id}
              onClick={() => setPeriod(option.id)}
              className={`rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
                period === option.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {period === "month" && improved ? (
        <p className="flex items-center gap-2 border-b border-slate-100 bg-emerald-50/60 px-6 py-2.5 text-sm text-emerald-900">
          <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            Most improved: <span className="font-semibold">{improved.full_name}</span>, up{" "}
            {improved.gain} on last month
          </span>
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="w-16 px-6 py-2.5">Rank</th>
              {period === "month" ? <th className="w-12 px-2 py-2.5"></th> : null}
              <th className="px-4 py-2.5">Panelist</th>
              <th className="px-6 py-2.5">Approved interviews</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row) => {
              const isYou = row.panelist_id === currentUserId;
              return (
                <tr
                  key={row.panelist_id}
                  className={`border-t border-slate-100 ${isYou ? "bg-blue-50/60" : ""}`}
                >
                  <td className="px-6 py-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                        row.count > 0 && MEDALS[row.rank] ? MEDALS[row.rank] : "text-slate-500"
                      }`}
                    >
                      {row.rank}
                    </span>
                  </td>
                  {period === "month" ? (
                    <td className="px-2 py-3">
                      <Movement
                        moved={row.moved}
                        isNew={row.last_month_count === 0 && row.count > 0}
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Avatar name={row.full_name} />
                      <span className="font-medium text-slate-800">{row.full_name}</span>
                      <TierBadge tier={tierFor(row.recent_count).tier} />
                      {isYou ? (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          You
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-right font-semibold tabular-nums text-slate-900">
                        {row.count}
                      </span>
                      <div className="h-2 min-w-24 flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-[#2a78d6]"
                          style={{ width: `${(row.count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function StandingCard({
  rows,
  currentUserId,
  href,
}: {
  rows: LeaderboardRow[];
  currentUserId: string;
  href?: string;
}) {
  // Early in a month nobody has anything approved yet; fall back to all time.
  const monthHasActivity = rows.some((row) => row.month_count > 0);
  const ranked = monthHasActivity
    ? monthlyBoard(rows)
    : rankBy(rows, "approved_count").map((row) => ({ ...row, moved: null }));
  const me = ranked.find((row) => row.panelist_id === currentUserId);
  const ahead = me ? ranked.filter((row) => row.count > me.count).at(-1) : undefined;
  const behind = me ? ranked.find((row) => row.count < me.count) : undefined;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Your standing</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {monthHasActivity ? "This month" : "All time, until this month's first approval"}
          </p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Trophy className="h-4.5 w-4.5" strokeWidth={2.25} />
        </span>
      </div>

      {me ? (
        <>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums tracking-tight text-slate-900">
              #{me.rank}
            </span>
            <span className="text-sm text-slate-500">
              of {ranked.length} panelist{ranked.length === 1 ? "" : "s"}
            </span>
            {me.moved ? (
              <Movement moved={me.moved} isNew={false} />
            ) : null}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {ahead
              ? `${ahead.count - me.count} more to catch ${ahead.full_name.split(" ")[0]}`
              : me.count > 0
                ? "You're leading the board"
                : "Get an interview approved to start climbing"}
          </p>
          {behind && me.count > 0 && me.count - behind.count <= 2 ? (
            <p className="mt-1 text-xs font-medium text-amber-700">
              {behind.full_name.split(" ")[0]} is only {me.count - behind.count} behind you
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-400">You&apos;re not on the board yet.</p>
      )}

      <ul className="mt-4 space-y-1">
        {ranked.slice(0, 3).map((row) => {
          const isYou = row.panelist_id === currentUserId;
          return (
            <li
              key={row.panelist_id}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${isYou ? "bg-blue-50" : ""}`}
            >
              <span className="w-4 text-center text-xs font-semibold tabular-nums text-slate-400">
                {row.rank}
              </span>
              <Avatar name={row.full_name} />
              <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                {row.full_name}
              </span>
              <span className="font-semibold tabular-nums text-slate-900">{row.count}</span>
            </li>
          );
        })}
      </ul>

      {href ? (
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View full leaderboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </section>
  );
}
