// The interview lengths on offer: what a panelist is paid by default for each,
// and the name and rate the vendor claims for it on the client invoice.
export const INTERVIEW_DURATIONS = [
  {
    minutes: 60,
    defaultPayout: 1000,
    claimRate: 1200,
    invoiceName: "Technical Interview - 60 mins",
  },
  {
    minutes: 90,
    defaultPayout: 1500,
    claimRate: 1800,
    invoiceName: "Technical Interview - 90 mins",
  },
] as const;

export function isOfferedDuration(minutes: number) {
  return INTERVIEW_DURATIONS.some((duration) => duration.minutes === minutes);
}

// How an interview turned out, and the share of the normal rate that is paid
// (and claimed on the invoice) for it. The database trigger `lock_entry_rate`
// in supabase/schema.sql carries the same percentages — change both together.
export const INTERVIEW_OUTCOMES = [
  { id: "completed", label: "Completed", short: "Completed", payoutPercent: 100 },
  {
    id: "partial",
    label: "Started – Partially Completed",
    short: "Partially completed",
    payoutPercent: 50,
  },
  {
    id: "student_no_show",
    label: "Interviewer joined, but Student No-Show / Cancelled",
    short: "Student no-show / cancelled",
    payoutPercent: 30,
  },
  {
    id: "interviewer_no_show",
    label: "Interviewer No-Show",
    short: "Interviewer no-show",
    payoutPercent: 0,
  },
  {
    id: "wrong_interview",
    label: "Wrong Interview Conducted",
    short: "Wrong interview",
    payoutPercent: 0,
  },
] as const;

export type OutcomeId = (typeof INTERVIEW_OUTCOMES)[number]["id"];

export function isOutcomeId(value: string): value is OutcomeId {
  return INTERVIEW_OUTCOMES.some((outcome) => outcome.id === value);
}

export function outcomeOf(id: string) {
  return INTERVIEW_OUTCOMES.find((outcome) => outcome.id === id) ?? INTERVIEW_OUTCOMES[0];
}
