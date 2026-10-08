import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

export default async function VendorLayout({
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

  if (profile?.role !== "vendor") redirect("/panelist");

  const { count: pendingCount } = await supabase
    .from("interview_entries")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        userLabel={profile.full_name}
        pendingCount={pendingCount ?? 0}
        links={[
          { href: "/vendor", label: "Dashboard", icon: "dashboard" },
          { href: "/vendor/entries", label: "Approvals", icon: "approvals" },
          { href: "/vendor/panelists", label: "Panelists", icon: "panelists" },
          { href: "/vendor/payments", label: "Payments", icon: "payments" },
          { href: "/vendor/invoice", label: "Invoices", icon: "invoice" },
        ]}
      />
      <main className="mx-auto w-full max-w-5xl px-8 py-10 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
