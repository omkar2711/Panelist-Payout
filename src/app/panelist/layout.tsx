import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";

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

  if (profile?.role !== "panelist") redirect("/vendor");

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav title="Panelist Payout" userLabel={profile.full_name} />
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}
