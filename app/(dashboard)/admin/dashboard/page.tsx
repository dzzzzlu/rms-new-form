import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminDashboard() {
  const supabase = createClient();

  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  const { count: requestCount } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true });
  const { count: pendingPayments } = await supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("status", "Pending");

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">Admin Overview</h2>
        <p className="text-sm text-slate-500">Institution-wide snapshot.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/admin/users" className="card hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-500">Total Users</p>
          <p className="text-3xl font-bold text-brand-700">{userCount ?? 0}</p>
        </Link>
        <Link href="/admin/analytics" className="card hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-500">Total Requests</p>
          <p className="text-3xl font-bold text-brand-700">{requestCount ?? 0}</p>
        </Link>
        <Link href="/registrar/payments" className="card hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-500">Pending Payments</p>
          <p className="text-3xl font-bold text-brand-700">{pendingPayments ?? 0}</p>
        </Link>
      </div>
    </div>
  );
}
