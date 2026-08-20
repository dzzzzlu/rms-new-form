import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = createClient();

  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  const { count: requestCount } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true });

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">Admin Overview</h2>
        <p className="text-sm text-slate-500">Institution-wide snapshot.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Total Users</p>
          <p className="text-3xl font-bold text-brand-700">{userCount ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Total Requests</p>
          <p className="text-3xl font-bold text-brand-700">{requestCount ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">System Status</p>
          <p className="text-lg font-semibold text-emerald-600">● Online</p>
        </div>
      </div>

      <div className="card">
        <p className="text-sm text-slate-500">
          User management, analytics charts, and reports are built out in the next phase.
        </p>
      </div>
    </div>
  );
}
