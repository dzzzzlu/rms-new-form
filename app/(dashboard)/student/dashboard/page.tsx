import { redirect } from "next/navigation";
import { createClient, getProfile } from "@/lib/supabase/server";
import type { RecentRequest } from "@/lib/types";
import Link from "next/link";
import { FileText } from "lucide-react";

export default async function StudentDashboard() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const supabase = createClient();

  const { count: totalRequests } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id);

  const { data: recent } = await supabase
    .from("requests")
    .select("id, tracking_code, status, created_at, documents(name)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const typedRecent = (recent ?? []) as unknown as RecentRequest[];

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="text-sm text-slate-500">Welcome back,</p>
        <h2 className="text-xl font-bold text-brand-900">{profile?.full_name}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Total Requests</p>
          <p className="text-3xl font-bold text-brand-700">{totalRequests ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Course</p>
          <p className="text-lg font-semibold text-brand-900">{profile?.course ?? "—"}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Student Number</p>
          <p className="text-lg font-semibold text-brand-900">{profile?.student_number ?? "—"}</p>
        </div>
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-brand-900">Recent Requests</h3>
          {typedRecent.length > 0 && (
            <Link href="/student/history" className="text-sm font-medium text-brand-600 hover:underline">
              View All →
            </Link>
          )}
        </div>
        {!typedRecent || typedRecent.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <FileText className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No requests yet. Use &ldquo;New Request&rdquo; to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {typedRecent.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{r.documents?.name}</p>
                  <p className="text-xs text-slate-500">{r.tracking_code}</p>
                </div>
                <span className="badge bg-brand-50 text-brand-700">{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
