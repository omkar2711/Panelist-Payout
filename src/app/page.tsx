import { redirect } from "next/navigation";
import { getSignedInProfile, getSignedInUserId } from "@/lib/session";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Supabase sends an OAuth sign-in back here (its "Site URL") whenever
  // /auth/callback isn't on its redirect allow-list. Hand it on rather than
  // dropping the sign-in.
  const params = await searchParams;
  const oauthParams = new URLSearchParams();
  for (const key of ["code", "error", "error_code", "error_description"]) {
    const value = params[key];
    if (typeof value === "string") oauthParams.set(key, value);
  }
  if (oauthParams.has("code") || oauthParams.has("error")) {
    redirect(`/auth/callback?${oauthParams}`);
  }

  if (!(await getSignedInUserId())) redirect("/login");

  const profile = await getSignedInProfile();
  if (!profile) redirect("/login?error=no-account");

  redirect(profile.role === "vendor" ? "/vendor" : "/panelist");
}
