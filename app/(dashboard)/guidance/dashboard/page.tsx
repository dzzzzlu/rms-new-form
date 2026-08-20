import { createClient } from "@/lib/supabase/server";

export default async function GuidanceDashboard() {
  const supabase = createClient();

  const { count: pending } = await supabase
    .from("requests")
    .select("*, documents!inner(name)", { count: "exact", head: true })
    .eq("documents.name", "Good Moral Certificate")
    .eq("guidance_status", "Pending");

  const { count: approved } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("guidance_status", "Approved");

  const { count: rejected } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("guidance_status", "Rejected");

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">Guidance Department</h2>
        <p className="text-sm text-slate-500">
          Good Moral Certificate requests require your approval before the registrar can release them.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Awaiting Review</p>
          <p className="text-3xl font-bold text-amber-600">{pending ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Approved</p>
          <p className="text-3xl font-bold text-emerald-600">{approved ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Rejected</p>
          <p className="text-3xl font-bold text-red-600">{rejected ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
