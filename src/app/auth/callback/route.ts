import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Only a short machine code is passed on to the login page; the full provider
// message goes to the server log so it can't be used to plant text on the page.
function failure(origin: string, code: string | null, logMessage: string) {
  console.error(`[auth/callback] Google sign-in failed: ${logMessage}`);
  const query = new URLSearchParams({ error: "oauth" });
  if (code && /^[a-z0-9_]{1,40}$/.test(code)) query.set("reason", code);
  return NextResponse.redirect(`${origin}/login?${query}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    const reason = searchParams.get("error_code") ?? searchParams.get("error");
    return failure(
      origin,
      reason,
      searchParams.get("error_description") ?? reason ?? "no code returned",
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return failure(origin, error?.code ?? null, error?.message ?? "no user returned");
  }

  // Access is invite-only: a Google account only gets in if the vendor has
  // already created a profile for that email.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=no-account`);
  }

  return NextResponse.redirect(
    `${origin}${profile.role === "vendor" ? "/vendor" : "/panelist"}`,
  );
}
