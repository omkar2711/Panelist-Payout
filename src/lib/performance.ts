import { NXTWAVE_TDS_RATE, PAYOUT_DEDUCTION_RATE, round2 } from "@/lib/deductions";
import { INTERVIEW_DURATIONS, outcomeOf } from "@/lib/interview-rates";
import type { EntryStatus } from "@/lib/types";

export type PerfEntry = {
  interview_date: string;
  status: EntryStatus;
  outcome: string;
  amount: number | null;
  duration_minutes: number | null;
};

// Recognition levels based on approved interviews in the last 90 days. They
// carry no money. The scale is built around the top goal of 5 interviews a
// day: 90 days hold about 65 working days, so 5 a day is roughly 325. The
// levels sit at about half, one and a half, three and four and a half
// interviews per working day.
export const TIERS = [
  { id: "starter", label: "Starter", min: 0 },
  { id: "bronze", label: "Bronze", min: 30 },
  { id: "silver", label: "Silver", min: 100 },
  { id: "gold", label: "Gold", min: 200 },
  { id: "platinum", label: "Platinum", min: 300 },
] as const;

// A week (Monday to Sunday) only counts toward a streak with this many interviews.
export const STREAK_WEEKLY_TARGET = 3;

export type TierId = (typeof TIERS)[number]["id"];

// Lifetime approved interviews. The first few come quickly on purpose, so a
// new panelist gets early wins; the gaps widen after that.
export const MILESTONES = [1, 3, 5, 10, 15, 25, 40, 60, 100, 150, 250, 500, 1000, 2500, 5000];
export const RECENT_DAYS = 90;

// The business runs on India time, wherever the server happens to be.
export function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function toDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function shiftDays(iso: string, days: number) {
  const date = toDate(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

function weekStart(iso: string) {
  const date = toDate(iso);
  return shiftDays(iso, -((date.getDay() + 6) % 7));
}

function previousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return toIso(new Date(year, month - 2, 1)).slice(0, 7);
}

export function monthLabel(monthKey: string) {
  return toDate(`${monthKey}-01`).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function isApproved(entry: PerfEntry) {
  return entry.status === "approved" || entry.status === "paid";
}

function paysSomething(entry: PerfEntry) {
  return outcomeOf(entry.outcome).payoutPercent > 0;
}

// An interview that counts on the leaderboard: approved, and not a 0% outcome.
export function isCounted(entry: PerfEntry) {
  return isApproved(entry) && paysSomething(entry);
}

export function tierFor(recentCount: number) {
  const index = TIERS.findLastIndex((tier) => recentCount >= tier.min);
  const next = TIERS[index + 1];
  return {
    tier: TIERS[index],
    next: next ?? null,
    toNext: next ? next.min - recentCount : 0,
  };
}

export function panelistStats(entries: PerfEntry[], today: string) {
  const thisMonth = today.slice(0, 7);
  const lastMonth = previousMonthKey(thisMonth);
  const counted = entries.filter(isCounted);

  // --- months
  const countByMonth = new Map<string, number>();
  for (const entry of counted) {
    const key = entry.interview_date.slice(0, 7);
    countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1);
  }
  const earnedIn = (monthKey: string) =>
    entries
      .filter((e) => isApproved(e) && e.interview_date.startsWith(monthKey))
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const awaitingThisMonth = entries.filter(
    (e) => e.status === "submitted" && e.interview_date.startsWith(thisMonth),
  ).length;

  let bestMonth: { label: string; count: number } | null = null;
  for (const [key, count] of countByMonth) {
    if (key >= thisMonth) continue;
    if (!bestMonth || count > bestMonth.count) bestMonth = { label: monthLabel(key), count };
  }

  const dayOfMonth = Number(today.slice(8));
  const daysInMonth = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
  const earnedThisMonth = earnedIn(thisMonth);
  // A straight-line projection is noise in the first days of a month.
  const projectedEarnings =
    dayOfMonth >= 5 && earnedThisMonth > 0
      ? Math.round((earnedThisMonth / dayOfMonth) * daysInMonth)
      : null;

  // --- weekly streak. Interviews still awaiting approval keep a streak alive,
  // so a slow confirmation doesn't break it; rejected ones drop out.
  const perWeek = new Map<string, number>();
  for (const entry of entries) {
    if (entry.status === "rejected" || !paysSomething(entry)) continue;
    const week = weekStart(entry.interview_date);
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
  }
  const activeWeeks = new Set(
    [...perWeek].filter(([, count]) => count >= STREAK_WEEKLY_TARGET).map(([week]) => week),
  );
  const currentWeek = weekStart(today);
  const thisWeekCount = perWeek.get(currentWeek) ?? 0;
  const hasThisWeek = activeWeeks.has(currentWeek);
  let streak = 0;
  for (
    let week = hasThisWeek ? currentWeek : shiftDays(currentWeek, -7);
    activeWeeks.has(week);
    week = shiftDays(week, -7)
  ) {
    streak += 1;
  }
  let bestStreak = 0;
  for (const week of activeWeeks) {
    if (activeWeeks.has(shiftDays(week, -7))) continue; // not the start of a run
    let run = 0;
    for (let cursor = week; activeWeeks.has(cursor); cursor = shiftDays(cursor, 7)) run += 1;
    bestStreak = Math.max(bestStreak, run);
  }

  // --- reliability over the recent window: the things a panelist controls.
  const windowStart = shiftDays(today, -RECENT_DAYS);
  const monthAgo = shiftDays(today, -30);
  const recent = entries.filter((e) => e.interview_date > windowStart);
  const decided = recent.filter((e) => isApproved(e) || e.status === "rejected");
  const strikeKind = (e: PerfEntry) =>
    e.status === "rejected"
      ? "rejected"
      : isApproved(e) && e.outcome === "interviewer_no_show"
        ? "noShow"
        : isApproved(e) && e.outcome === "wrong_interview"
          ? "wrong"
          : null;
  const strikes = { noShow: 0, wrong: 0, rejected: 0 };
  let strikesLast30 = 0;
  for (const entry of decided) {
    const kind = strikeKind(entry);
    if (!kind) continue;
    strikes[kind] += 1;
    if (entry.interview_date > monthAgo) strikesLast30 += 1;
  }
  const strikeTotal = strikes.noShow + strikes.wrong + strikes.rejected;

  // --- lifetime
  const lifetime = counted.length;
  const nextMilestone = MILESTONES.find((m) => m > lifetime) ?? null;
  const reached = MILESTONES.filter((m) => m <= lifetime);
  const recentCount = recent.filter(isCounted).length;
  const lastInterview =
    entries
      .filter((e) => e.status !== "rejected")
      .map((e) => e.interview_date)
      .sort()
      .at(-1) ?? null;

  return {
    thisMonth: {
      label: monthLabel(thisMonth),
      count: countByMonth.get(thisMonth) ?? 0,
      earned: earnedThisMonth,
      awaiting: awaitingThisMonth,
      projectedEarnings,
    },
    lastMonth: {
      label: monthLabel(lastMonth),
      count: countByMonth.get(lastMonth) ?? 0,
      earned: earnedIn(lastMonth),
    },
    bestMonth,
    streak: {
      current: streak,
      best: bestStreak,
      atRisk: streak > 0 && !hasThisWeek,
      thisWeek: thisWeekCount,
      target: STREAK_WEEKLY_TARGET,
    },
    reliability: {
      percent: decided.length
        ? Math.round(((decided.length - strikeTotal) / decided.length) * 100)
        : null,
      decided: decided.length,
      strikes,
      strikeTotal,
      strikesLast30,
    },
    lifetime,
    nextMilestone,
    previousMilestone: reached.at(-1) ?? 0,
    reached,
    recentCount,
    ...tierFor(recentCount),
    lastInterview,
  };
}

export type PanelistStats = ReturnType<typeof panelistStats>;

// What the vendor claims from the client for one approved interview, or null
// when the slot isn't one that is billed.
export function claimFor(entry: PerfEntry) {
  const slot = INTERVIEW_DURATIONS.find((d) => d.minutes === entry.duration_minutes);
  if (!slot) return null;
  return (slot.claimRate * outcomeOf(entry.outcome).payoutPercent) / 100;
}

// Billable amount, panelist cost and the margin between them for approved
// interviews, optionally limited to one month ("yyyy-mm").
export function financeSummary(entries: PerfEntry[], monthKey?: string) {
  let billable = 0;
  let cost = 0;
  let interviews = 0;
  let unbillable = 0;
  for (const entry of entries) {
    if (!isApproved(entry)) continue;
    if (monthKey && !entry.interview_date.startsWith(monthKey)) continue;
    interviews += 1;
    cost += entry.amount ?? 0;
    const claim = claimFor(entry);
    if (claim === null) unbillable += 1;
    else billable += claim;
  }
  return { billable, cost, margin: billable - cost, interviews, unbillable };
}

export type MonthFinance = {
  key: string;
  label: string;
  interviews: number;
  // NxtWave side: the bill, the 10% TDS NxtWave keeps back, what it should pay.
  // `billable` is the invoice actually raised when one is recorded, otherwise
  // the app's estimate from the approved interviews (`estimated`).
  billable: number;
  estimated: number;
  invoiced: boolean;
  tds: number;
  netDue: number;
  received: number;
  receivable: number;
  // panelist side: payouts before and after the 10% deduction
  cost: number;
  deduction: number;
  netCost: number;
  paid: number;
  owed: number;
  // what we keep once both sides are settled
  margin: number;
  // money actually received from NxtWave minus money actually paid to panelists
  actualMargin: number;
};

// Money for approved interviews, grouped by the month the interview took place,
// newest month first. Panelist cash is exact per interview (`cashPaid`).
// Receipts from NxtWave are lump sums that aren't tied to particular
// interviews, so they are counted against the oldest unpaid month first.
export function financeByMonth(
  entries: (PerfEntry & { id: string })[],
  receivedTotal: number,
  cashPaid: Map<string, number>,
  invoices: Map<string, number> = new Map(),
) {
  const byKey = new Map<string, MonthFinance>();
  let owedInterviews = 0;
  let unbillable = 0;
  const monthFor = (key: string) => {
    let month = byKey.get(key);
    if (!month) {
      month = {
        key,
        label: monthLabel(key),
        interviews: 0,
        billable: 0,
        estimated: 0,
        invoiced: false,
        tds: 0,
        netDue: 0,
        received: 0,
        receivable: 0,
        cost: 0,
        deduction: 0,
        netCost: 0,
        paid: 0,
        owed: 0,
        margin: 0,
        actualMargin: 0,
      };
      byKey.set(key, month);
    }
    return month;
  };
  for (const key of invoices.keys()) monthFor(key);
  for (const entry of entries) {
    if (!isApproved(entry)) continue;
    const month = monthFor(entry.interview_date.slice(0, 7));
    const amount = entry.amount ?? 0;
    month.interviews += 1;
    month.cost += amount;
    month.deduction += round2(amount * PAYOUT_DEDUCTION_RATE);
    if (entry.status === "paid") month.paid += cashPaid.get(entry.id) ?? amount;
    else owedInterviews += 1;
    const claim = claimFor(entry);
    if (claim === null) unbillable += 1;
    else month.estimated += claim;
  }
  for (const month of byKey.values()) {
    const invoice = invoices.get(month.key);
    month.invoiced = invoice !== undefined;
    month.billable = invoice ?? month.estimated;
  }

  const oldestFirst = [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  let unallocated = receivedTotal;
  for (const month of oldestFirst) {
    month.tds = round2(month.billable * NXTWAVE_TDS_RATE);
    month.netDue = round2(month.billable - month.tds);
    month.received = Math.min(unallocated, month.netDue);
    unallocated = round2(unallocated - month.received);
    month.receivable = round2(month.netDue - month.received);
    month.netCost = round2(month.cost - month.deduction);
    month.paid = round2(month.paid);
    month.owed = round2(month.netCost - month.paid);
    month.margin = round2(month.netDue - month.netCost);
    month.actualMargin = round2(month.received - month.paid);
  }

  const sum = (pick: (month: MonthFinance) => number) =>
    round2(oldestFirst.reduce((total, month) => total + pick(month), 0));
  return {
    months: oldestFirst.reverse(),
    totals: {
      interviews: sum((m) => m.interviews),
      billable: sum((m) => m.billable),
      estimated: sum((m) => m.estimated),
      invoiced: oldestFirst.every((m) => m.invoiced),
      tds: sum((m) => m.tds),
      netDue: sum((m) => m.netDue),
      received: sum((m) => m.received),
      receivable: sum((m) => m.receivable),
      cost: sum((m) => m.cost),
      deduction: sum((m) => m.deduction),
      netCost: sum((m) => m.netCost),
      paid: sum((m) => m.paid),
      owed: sum((m) => m.owed),
      margin: sum((m) => m.margin),
      actualMargin: sum((m) => m.actualMargin),
    },
    owedInterviews,
    unbillable,
    // Money received beyond everything due so far.
    advance: unallocated,
  };
}

export type OutcomeCountRow = {
  panelistId: string;
  name: string;
  total: number;
  counts: Record<string, number>;
};

// Approved interviews per panelist, split by how each one turned out,
// optionally limited to one month ("yyyy-mm"). Busiest panelist first.
export function outcomeCountsByPanelist(
  entries: (PerfEntry & { panelist_id: string })[],
  names: Map<string, string>,
  monthKey?: string,
) {
  const rows = new Map<string, OutcomeCountRow>();
  for (const entry of entries) {
    if (!isApproved(entry)) continue;
    if (monthKey && !entry.interview_date.startsWith(monthKey)) continue;
    let row = rows.get(entry.panelist_id);
    if (!row) {
      row = {
        panelistId: entry.panelist_id,
        name: names.get(entry.panelist_id) ?? "Unknown panelist",
        total: 0,
        counts: {},
      };
      rows.set(entry.panelist_id, row);
    }
    row.total += 1;
    row.counts[entry.outcome] = (row.counts[entry.outcome] ?? 0) + 1;
  }
  return [...rows.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

// Entries that have sat unreviewed for longer than `days`.
export function stalePendingCount(
  entries: { status: EntryStatus; created_at: string }[],
  days: number,
) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter(
    (entry) => entry.status === "submitted" && new Date(entry.created_at).getTime() < cutoff,
  ).length;
}
