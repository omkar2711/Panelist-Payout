"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
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

export async function addPanelist(_prevState: unknown, formData: FormData) {
  await assertVendor();

  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "") || null;
  const default_rate = Number(formData.get("default_rate") ?? 0);

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
    default_rate,
  });

  if (panelistError) {
    return { error: panelistError.message, tempPassword: "" };
  }

  revalidatePath("/vendor/panelists");
  return { error: "", tempPassword, email };
}

export async function updateRate(formData: FormData) {
  const { supabase } = await assertVendor();

  const panelist_id = String(formData.get("panelist_id") ?? "");
  const default_rate = Number(formData.get("default_rate") ?? 0);
  if (!panelist_id) return;

  await supabase.from("panelists").update({ default_rate }).eq("id", panelist_id);
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
    .update({ status: "rejected" })
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
  if (!amount || amount <= 0) {
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
