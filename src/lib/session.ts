import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type SignedInProfile = { id: string; role: "vendor" | "panelist"; full_name: string };

// Who is signed in, for pages that only read. The sign-in token's signature is
// checked locally against Supabase's published key (no network call once the
// key is cached), and React's cache shares the answer between the layout and
// the page of one request. Server actions that change data still confirm the
// session with the auth server via getUser().
export const getSignedInUserId = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" ? sub : null;
});

export const getSignedInProfile = cache(async () => {
  const id = await getSignedInUserId();
  if (!id) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", id)
    .single();
  return (data as SignedInProfile | null) ?? null;
});
