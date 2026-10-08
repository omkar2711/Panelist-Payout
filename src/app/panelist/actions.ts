"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addEntry(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const interview_date = String(formData.get("interview_date") ?? "");
  if (!interview_date) {
    return { error: "Interview date is required." };
  }

  const start_time = String(formData.get("start_time") ?? "") || null;
  const durationRaw = formData.get("duration_minutes");
  const duration_minutes = durationRaw ? Number(durationRaw) : null;
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
    interview_type,
    candidate_ref,
    notes,
  });

  if (error) {
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
