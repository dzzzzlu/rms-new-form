import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile) redirect("/login");

  return (
    <DashboardShell role={profile.role} fullName={profile.full_name} userId={profile.id}>
      {children}
    </DashboardShell>
  );
}
