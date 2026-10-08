import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { ORG_NAME } from "@/lib/brand";

export default async function PanelistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login?error=no-account");
  if (profile.role !== "panelist") redirect("/vendor");

  const { data: panelist } = await supabase
    .from("panelists")
    .select("active")
    .eq("id", user.id)
    .single();
  if (!panelist?.active) redirect("/login?error=inactive");

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 via-slate-50 to-slate-50">
      <Nav
        title={ORG_NAME}
        userLabel={profile.full_name}
        links={[
          { href: "/panelist", label: "Dashboard" },
          { href: "/panelist/leaderboard", label: "Leaderboard" },
        ]}
      />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
    </div>
  );
}
