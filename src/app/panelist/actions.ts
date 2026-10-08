"use server";

import { revalidatePath } from "next/cache";
import { isOfferedDuration, isOutcomeId } from "@/lib/interview-rates";
import { todayInIndia } from "@/lib/performance";
import { createClient } from "@/lib/supabase/server";

export async function addEntry(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const interview_date = String(formData.get("interview_date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(interview_date)) {
    return { error: "Interview date is required." };
  }

  if (interview_date > todayInIndia()) {
    return { error: "The interview date can't be in the future." };
  }

  const start_time = String(formData.get("start_time") ?? "");
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(start_time)) {
    return { error: "Start time is required." };
  }

  const duration_minutes = Number(formData.get("duration_minutes"));
  if (!isOfferedDuration(duration_minutes)) {
    return { error: "Choose the scheduled duration: 60 or 90 minutes." };
  }
  const outcome = String(formData.get("outcome") ?? "");
  if (!isOutcomeId(outcome)) {
    return { error: "Choose the interview status." };
  }

  const interview_type = String(formData.get("interview_type") ?? "") || null;
  const candidate_ref = String(formData.get("candidate_ref") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;

  // panelist_id is taken from the authenticated session, never from the
  // form, and the insert RLS policy also requires it to match auth.uid().
  const { error } = await supabase.from("interview_entries").insert({
    panelist_id: user.id,
    interview_date,
    start_time,
    duration_minutes,
    outcome,
    interview_type,
    candidate_ref,
    notes,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You've already logged an interview at that date and time." };
    }
    if (error.code === "42501") {
      return { error: "This entry wasn't accepted. If your account is active, check the details and try again." };
    }
    return { error: error.message };
  }

  revalidatePath("/panelist");
  return { error: "" };
}

export async function revokeEntry(entryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  // The RLS delete policy also restricts this to the panelist's own
  // still-submitted entries, so an already-approved entry can't be revoked.
  const { error } = await supabase
    .from("interview_entries")
    .delete()
    .eq("id", entryId)
    .eq("panelist_id", user.id)
    .eq("status", "submitted");

  if (error) throw new Error(error.message);
  revalidatePath("/panelist");
}
