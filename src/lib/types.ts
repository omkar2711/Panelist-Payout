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
  default_rate: number;
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
  amount: number;
  paid_on: string;
  mode: string | null;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
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

