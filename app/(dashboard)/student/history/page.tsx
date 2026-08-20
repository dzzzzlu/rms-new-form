import { createClient, getProfile } from "@/lib/supabase/server";
import type { RequestStatus } from "@/lib/types";
import { Clock } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  Pending: "bg-slate-100 text-slate-700",
  "Payment Verification": "bg-amber-50 text-amber-700",
  Processing: "bg-brand-50 text-brand-700",
  "Ready for Pickup": "bg-indigo-50 text-indigo-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
};

type HistoryRequest = {
  id: number;
  tracking_code: string;
  purpose: string | null;
  copies: number;
  status: RequestStatus;
  created_at: string;
  documents: { name: string; fee: number } | null;
};

export default async function HistoryPage() {
  const profile = await getProfile();
  const supabase = createClient();

  const { data: requests } = await supabase
    .from("requests")
    .select("id, tracking_code, purpose, copies, status, created_at, documents(name, fee)")
    .eq("user_id", profile!.id)
    .order("created_at", { ascending: false });

  const typedRequests = (requests ?? []) as unknown as HistoryRequest[];

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">My Request History</h2>
        <p className="text-sm text-slate-500">Track the status of every document request you've submitted.</p>
      </div>

      {typedRequests.length === 0 ? (
        <div className="empty-state card">
          <Clock className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {typedRequests.map((r) => (
            <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-900">{r.documents?.name}</p>
                <p className="text-xs text-slate-500">
                  {r.tracking_code} · {r.copies} cop{r.copies > 1 ? "ies" : "y"} ·{" "}
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
                {r.purpose && <p className="mt-1 text-sm text-slate-600">Purpose: {r.purpose}</p>}
              </div>
              <span className={`badge ${STATUS_COLOR[r.status] ?? "bg-slate-100 text-slate-700"}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
