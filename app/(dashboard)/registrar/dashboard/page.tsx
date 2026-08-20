import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const STATUS_LINKS: Record<string, string> = {
  Pending: "/registrar/requests",
  "Payment Verification": "/registrar/payments",
  Processing: "/registrar/requests",
  "Ready for Pickup": "/registrar/requests",
  Completed: "/registrar/requests",
  Rejected: "/registrar/requests",
};

export default async function RegistrarDashboard() {
  const supabase = createClient();

  const statuses = ["Pending", "Payment Verification", "Processing", "Ready for Pickup", "Completed", "Rejected"] as const;
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {statuses.map((s, i) => (
          <Link key={s} href={STATUS_LINKS[s]} className="card hover:shadow-md transition-shadow">
            <p className="text-sm text-slate-500">{s}</p>
            <p className="text-3xl font-bold text-brand-700">{counts[i].count ?? 0}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
