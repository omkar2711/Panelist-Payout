import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSignedInProfile, getSignedInUserId } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";
import { DayChangeRefresh } from "@/components/day-change-refresh";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await getSignedInUserId())) redirect("/login");

  const supabase = await createClient();
  const [profile, { count: pendingCount }] = await Promise.all([
    getSignedInProfile(),
    supabase
      .from("interview_entries")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
  ]);

  if (!profile) redirect("/login?error=no-account");
  if (profile.role !== "vendor") redirect("/panelist");

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50/60 via-slate-50 to-slate-50 lg:flex-row print:bg-none">
      <DayChangeRefresh />
      <Sidebar
        userLabel={profile.full_name}
        pendingCount={pendingCount ?? 0}
        links={[
          { href: "/vendor", label: "Dashboard", icon: "dashboard" },
          { href: "/vendor/entries", label: "Approvals", icon: "approvals" },
          { href: "/vendor/interviews", label: "Interviews", icon: "interviews" },
          { href: "/vendor/panelists", label: "Panelists", icon: "panelists" },
          { href: "/vendor/leaderboard", label: "Leaderboard", icon: "leaderboard" },
          { href: "/vendor/payments", label: "Payments", icon: "payments" },
          { href: "/vendor/invoice", label: "Invoices", icon: "invoice" },
        ]}
      />
      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
