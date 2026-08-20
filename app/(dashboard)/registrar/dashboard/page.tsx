import { createClient } from "@/lib/supabase/server";

export default async function RegistrarDashboard() {
  const supabase = createClient();

  const statuses = ["Pending", "Payment Verification", "Processing", "Ready for Pickup"] as const;
  const counts = await Promise.all(
    statuses.map((s) =>
      supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", s)
    )
  );

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">Registrar Overview</h2>
        <p className="text-sm text-slate-500">Live snapshot of incoming document requests.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statuses.map((s, i) => (
          <div key={s} className="card">
            <p className="text-sm text-slate-500">{s}</p>
            <p className="text-3xl font-bold text-brand-700">{counts[i].count ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <p className="text-sm text-slate-500">
          Full request management, payment verification, and reports are built out in the next phase.
        </p>
      </div>
    </div>
  );
}
