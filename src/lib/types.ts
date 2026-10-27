import type { OutcomeId } from "@/lib/interview-rates";

export type UserRole = "vendor" | "panelist";
export type EntryStatus = "submitted" | "approved" | "rejected" | "paid";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  created_at: string;
}

export interface Panelist {
  id: string;
  phone: string | null;
  rate_60: number;
  rate_90: number;
  active: boolean;
  created_at: string;
}

export interface InterviewEntry {
  id: string;
  panelist_id: string;
  interview_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  interview_type: string | null;
  outcome: OutcomeId;
  candidate_ref: string | null;
  notes: string | null;
  status: EntryStatus;
  rate_applied: number | null;
  amount: number | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  panelist_id: string;
  // cash actually paid, after the 10% deduction and any September adjustment
  amount: number;
  tds_amount: number;
  recovery_amount: number;
  // paid before the 10% deduction started, so its 10% is recovered later
  paid_in_full: boolean;
  paid_on: string;
  mode: string | null;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LeaderboardRow {
  panelist_id: string;
  full_name: string;
  approved_count: number;
  month_count: number;
  last_month_count: number;
  recent_count: number;
}

export interface PanelistBalance {
  panelist_id: string;
  full_name: string;
  email: string;
  active: boolean;
  amount_due: number;
  amount_paid: number;
  pending_review_count: number;
  approved_interview_count: number;
}

