import { outcomeOf, type OutcomeId } from "@/lib/interview-rates";
import { isCounted } from "@/lib/performance";
import type { InterviewEntry, LeaderboardRow } from "@/lib/types";

// Panelist logins kept for trying the app out. They see made-up interviews
// instead of their own, can't save anything, and are left out of every
// vendor list and total.
const TEST_PANELIST_IDS = new Set([
  "ebc4a469-e144-4db0-b7fc-cacd8f15d898", // Omkar Bharitkar, omkar.tsx@gmail.com
]);

export function isTestPanelist(id: string | null | undefined) {
  return !!id && TEST_PANELIST_IDS.has(id);
}

export function withoutTestPanelists<T>(rows: T[], idOf: (row: T) => string) {
  return rows.filter((row) => !isTestPanelist(idOf(row)));
}

// --- sample data -----------------------------------------------------------

const SAMPLE_START = "2026-09-01";
const RATES = { 60: 1000, 90: 1500 } as const;
const TYPES = [
  "TR2",
  "EDGE 2.0 || DS & ML Interview",
  "EDGE 2.0|| MERN FullStack + DSA Interview",
  "EDGE 2.0 || Python Full Stack Interview",
  "EDGE 2.0|| JAVA FullStack + DSA Interview",
  "EDGE 2.0 || GEN-AI Interview",
  "EDGE 2.0 || Data Analyst",
];
const FIRST = ["Aarav", "Diya", "Rohan", "Sneha", "Karan", "Ananya", "Vikram", "Pooja", "Arjun", "Meera", "Rahul", "Isha", "Nikhil", "Tanvi", "Siddharth", "Riya"];
const LAST = ["Sharma", "Patil", "Reddy", "Iyer", "Gupta", "Deshmukh", "Nair", "Joshi", "Kulkarni", "Singh", "Rao", "Mehta"];
const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

// A small seeded generator, so each day's sample interviews come out the same
// on every load and don't shift as new days are added.
function seeded(text: string) {
  let seed = 2166136261;
  for (const char of text) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthBefore(key: string) {
  const [year, month] = key.split("-").map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}

function sampleOutcome(roll: number): OutcomeId {
  if (roll < 0.82) return "completed";
  if (roll < 0.86) return "partial";
  if (roll < 0.94) return "student_no_show";
  return "cancelled";
}

// Made-up interviews for a test panelist from September to today, following
// the real monthly cycle: last month is paid after the 10th, this month's are
// approved, and the last two days still await review.
export function sampleEntries(panelistId: string, today: string): InterviewEntry[] {
  const thisMonth = today.slice(0, 7);
  const lastMonth = monthBefore(thisMonth);
  const lastMonthPaid = Number(today.slice(8, 10)) > 10;
  const entries: InterviewEntry[] = [];

  for (let day = SAMPLE_START; day <= today; day = addDays(day, 1)) {
    const random = seeded(`${panelistId}:${day}`);
    const sunday = new Date(`${day}T00:00:00Z`).getUTCDay() === 0;
    const count = Math.floor(random() * (sunday ? 1.6 : 3.4));
    const hours = [...HOURS].sort(() => random() - 0.5).slice(0, count).sort((a, b) => a - b);

    hours.forEach((hour, index) => {
      const minutes = random() < 0.55 ? 60 : 90;
      const outcome = sampleOutcome(random());
      const rejected = random() < 0.02;
      const month = day.slice(0, 7);
      const status: InterviewEntry["status"] =
        day > addDays(today, -2)
          ? "submitted"
          : rejected
            ? "rejected"
            : month < lastMonth || (month === lastMonth && lastMonthPaid)
              ? "paid"
              : "approved";
      const settled = status === "approved" || status === "paid";
      const rate = RATES[minutes];
      const time = `${String(hour).padStart(2, "0")}:00:00`;

      entries.push({
        id: `sample-${day}-${index}`,
        panelist_id: panelistId,
        interview_date: day,
        start_time: time,
        duration_minutes: minutes,
        interview_type: TYPES[Math.floor(random() * TYPES.length)],
        outcome,
        candidate_ref: `${FIRST[Math.floor(random() * FIRST.length)]} ${LAST[Math.floor(random() * LAST.length)]}`,
        notes: null,
        status,
        rate_applied: settled ? rate : null,
        amount: settled ? (rate * outcomeOf(outcome).payoutPercent) / 100 : null,
        approved_by: null,
        approved_at: settled ? `${addDays(day, 1)}T10:00:00+05:30` : null,
        created_at: `${day}T${time}+05:30`,
      });
    });
  }

  return entries.sort((a, b) =>
    b.interview_date.localeCompare(a.interview_date) || (b.start_time ?? "").localeCompare(a.start_time ?? ""),
  );
}

// The real leaderboard with the test panelist placed by their sample
// interviews, counted the same way get_leaderboard counts real ones.
export function sampleLeaderboard(
  rows: LeaderboardRow[],
  panelistId: string,
  fullName: string,
  entries: InterviewEntry[],
  today: string,
): LeaderboardRow[] {
  const thisMonth = today.slice(0, 7);
  const counted = entries.filter(isCounted);
  const own: LeaderboardRow = {
    panelist_id: panelistId,
    full_name: fullName,
    approved_count: counted.length,
    month_count: counted.filter((e) => e.interview_date.startsWith(thisMonth)).length,
    last_month_count: counted.filter((e) => e.interview_date.startsWith(monthBefore(thisMonth))).length,
    recent_count: counted.filter((e) => e.interview_date > addDays(today, -90)).length,
  };
  return [...withoutTestPanelists(rows, (row) => row.panelist_id), own].sort(
    (a, b) => b.approved_count - a.approved_count || a.full_name.localeCompare(b.full_name),
  );
}
