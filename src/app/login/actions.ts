"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Incorrect email or password." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "No profile is set up for this account yet." };
  }

  if (profile.role === "panelist") {
    const { data: panelist } = await supabase
      .from("panelists")
      .select("active")
      .eq("id", data.user.id)
      .single();
    if (!panelist?.active) {
      await supabase.auth.signOut();
      return { error: "Your account has been deactivated. Please contact the vendor." };
    }
  }

  redirect(profile.role === "vendor" ? "/vendor" : "/panelist");
}

export async function requestPasswordReset(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Enter the email address you sign in with.", sentTo: "" };
  }

  const headerList = await headers();
  const origin = headerList.get("origin") ?? `http://${headerList.get("host")}`;

  // A one-off client using the implicit flow, so the emailed link works in
  // any browser or device rather than only the one that asked for it.
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    console.error(`[forgot-password] ${error.code ?? error.status}: ${error.message}`);
    if (error.status === 429) {
      return {
        error: "Too many reset emails were requested. Please wait a few minutes and try again.",
        sentTo: "",
      };
    }
    // Anything else is reported the same as success, so this form can't be
    // used to find out which email addresses have an account.
  }

  return { error: "", sentTo: email };
}
