"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isOutcomeId, outcomeOf } from "@/lib/interview-rates";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function assertVendor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "vendor") throw new Error("Forbidden.");
  return { supabase, user };
}

function isValidRate(rate: number) {
  return Number.isFinite(rate) && rate >= 0;
}

export async function addPanelist(_prevState: unknown, formData: FormData) {
  await assertVendor();

  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "") || null;
  const rate_60 = Number(formData.get("rate_60"));
  const rate_90 = Number(formData.get("rate_90"));

  if (!isValidRate(rate_60) || !isValidRate(rate_90)) {
    return { error: "Enter a valid payout rate for both durations.", tempPassword: "" };
  }

  if (!full_name || !email) {
    return { error: "Name and email are required.", tempPassword: "" };
  }

  const admin = createAdminClient();
  const tempPassword = randomUUID().slice(0, 12);

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

  if (createError || !created.user) {
    return {
      error: createError?.message ?? "Could not create the panelist account.",
      tempPassword: "",
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    role: "panelist",
    full_name,
    email,
  });

  if (profileError) {
    return { error: profileError.message, tempPassword: "" };
  }

  const { error: panelistError } = await admin.from("panelists").insert({
    id: created.user.id,
    phone,
    rate_60,
    rate_90,
  });

  if (panelistError) {
    return { error: panelistError.message, tempPassword: "" };
  }

  revalidatePath("/vendor/panelists");
  return { error: "", tempPassword, email };
}

export async function updateRates(formData: FormData) {
  const { supabase } = await assertVendor();

  const panelist_id = String(formData.get("panelist_id") ?? "");
  const rate_60 = Number(formData.get("rate_60"));
  const rate_90 = Number(formData.get("rate_90"));
  if (!panelist_id || !isValidRate(rate_60) || !isValidRate(rate_90)) return;

  await supabase.from("panelists").update({ rate_60, rate_90 }).eq("id", panelist_id);
  revalidatePath("/vendor/panelists");
}

export async function togglePanelistActive(panelistId: string, active: boolean) {
  const { supabase } = await assertVendor();
  await supabase.from("panelists").update({ active }).eq("id", panelistId);
  revalidatePath("/vendor/panelists");
}

export async function approveEntry(entryId: string) {
  const { supabase } = await assertVendor();
  const { error } = await supabase
    .from("interview_entries")
    .update({ status: "approved" })
    .eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidatePath("/vendor/entries");
  revalidatePath("/vendor");
  revalidatePath("/vendor/payments");
}

export async function rejectEntry(entryId: string) {
  const { supabase } = await assertVendor();
  const { error } = await supabase
    .from("interview_entries")
    .update({
      status: "rejected",
      rate_applied: null,
      amount: null,
      approved_at: null,
      approved_by: null,
    })
    .eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidatePath("/vendor/entries");
}

export async function recordPayment(_prevState: unknown, formData: FormData) {
  const { supabase } = await assertVendor();

  const panelist_id = String(formData.get("panelist_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const paid_on = String(formData.get("paid_on") ?? "");
  const mode = String(formData.get("mode") ?? "") || null;
  const reference = String(formData.get("reference") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;
  const entryIds = formData.getAll("entry_ids").map(String);

  if (!panelist_id || entryIds.length === 0) {
    return { error: "Select at least one approved interview to pay." };
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "Enter a valid amount." };
  }

  const { error } = await supabase.rpc("record_payment", {
    p_panelist_id: panelist_id,
    p_amount: amount,
    p_paid_on: paid_on || new Date().toISOString().slice(0, 10),
    p_mode: mode,
    p_reference: reference,
    p_notes: notes,
    p_entry_ids: entryIds,
  });

  if (error) return { error: error.message };

  revalidatePath("/vendor/payments");
  revalidatePath("/vendor");
  revalidatePath("/vendor/entries");
  return { error: "" };
}

export async function recordReceipt(_prevState: unknown, formData: FormData) {
  const { supabase, user } = await assertVendor();

  const amount = Number(formData.get("amount"));
  const received_on = String(formData.get("received_on") ?? "");
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter the amount you received.", saved: 0 };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(received_on)) {
    return { error: "Choose the date it was received.", saved: 0 };
  }

  const { error } = await supabase.from("payout_batches").insert({
    amount,
    received_on,
    period_label: String(formData.get("period_label") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: user.id,
  });
  if (error) return { error: error.message, saved: 0 };

  revalidatePath("/vendor/payments");
  revalidatePath("/vendor");
  return { error: "", saved: amount };
}

const EDITABLE_STATUSES = ["submitted", "approved", "rejected"];

function revalidateEntryViews() {
  revalidatePath("/vendor");
  revalidatePath("/vendor/entries");
  revalidatePath("/vendor/payments");
  revalidatePath("/panelist");
}

export async function updateEntry(_prevState: unknown, formData: FormData) {
  const { supabase } = await assertVendor();

  const id = String(formData.get("id") ?? "");
  const interview_date = String(formData.get("interview_date") ?? "");
  const status = String(formData.get("status") ?? "");
  const durationRaw = String(formData.get("duration_minutes") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();

  const outcome = String(formData.get("outcome") ?? "");

  if (!id || !interview_date) return { error: "Interview date is required." };
  if (!EDITABLE_STATUSES.includes(status)) return { error: "Choose a valid status." };
  if (!isOutcomeId(outcome)) return { error: "Choose the interview status." };

  const duration_minutes = durationRaw === "" ? null : Number(durationRaw);
  if (duration_minutes !== null && (!Number.isFinite(duration_minutes) || duration_minutes < 0)) {
    return { error: "Enter a valid duration." };
  }
  const amount = amountRaw === "" ? null : Number(amountRaw);
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
    return { error: "Enter a valid amount." };
  }

  const changes: Record<string, string | number | null> = {
    interview_date,
    start_time: String(formData.get("start_time") ?? "") || null,
    duration_minutes,
    outcome,
    interview_type: String(formData.get("interview_type") ?? "").trim() || null,
    candidate_ref: String(formData.get("candidate_ref") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    status,
  };

  if (status === "approved") {
    if (amount !== null) {
      changes.rate_applied = amount;
      changes.amount = amount;
    } else {
      // Blank amount: the panelist's rate for this slot, times the share that
      // is paid for this interview status.
      const { data: entry } = await supabase
        .from("interview_entries")
        .select("panelists(rate_60, rate_90)")
        .eq("id", id)
        .maybeSingle<{ panelists: { rate_60: number; rate_90: number } }>();
      if (!entry) return { error: "That entry no longer exists." };
      const rate = duration_minutes === 90 ? entry.panelists.rate_90 : entry.panelists.rate_60;
      changes.rate_applied = rate;
      changes.amount = Math.round(rate * outcomeOf(outcome).payoutPercent) / 100;
    }
  } else {
    // Clearing these means a later re-approval picks up the current rate.
    changes.rate_applied = null;
    changes.amount = null;
    changes.approved_at = null;
    changes.approved_by = null;
  }

  const { data, error } = await supabase
    .from("interview_entries")
    .update(changes)
    .eq("id", id)
    .neq("status", "paid")
    .select("id");

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "This panelist already has another interview at that date and time."
          : error.message,
    };
  }
  if (!data?.length) {
    return { error: "This entry has already been paid, so it can no longer be changed." };
  }

  revalidateEntryViews();
  redirect("/vendor/entries");
}

export async function deleteEntry(entryId: string) {
  const { supabase } = await assertVendor();

  const { data, error } = await supabase
    .from("interview_entries")
    .delete()
    .eq("id", entryId)
    .neq("status", "paid")
    .select("id");

  if (error) throw new Error(error.message);
  if (!data?.length) {
    throw new Error("This entry could not be deleted. Paid entries are locked.");
  }

  revalidateEntryViews();
  redirect("/vendor/entries");
}
