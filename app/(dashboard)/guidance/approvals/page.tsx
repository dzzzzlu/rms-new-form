"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ApprovalStatus } from "@/lib/types";
import { ClipboardCheck } from "lucide-react";

type GoodMoralRequest = {
  id: number;
  tracking_code: string;
  purpose: string | null;
  guidance_status: ApprovalStatus | null;
  created_at: string;
  documents: { name: string } | null;
  profiles: { full_name: string; student_number: string | null; course: string | null } | null;
};

export default function GuidanceApprovalsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<GoodMoralRequest[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("requests")
      .select(
        "id, tracking_code, purpose, guidance_status, created_at, documents!inner(name), profiles(full_name, student_number, course)"
      )
      .eq("documents.name", "Good Moral Certificate")
      .order("created_at", { ascending: false });
    setRequests((data as unknown as GoodMoralRequest[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id: number, status: "Approved" | "Rejected") {
    await supabase.from("requests").update({ guidance_status: status }).eq("id", id);
    await supabase.from("status_history").insert({
      request_id: id,
      status: `Guidance ${status}`,
    });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">Good Moral Approvals</h2>
        <p className="text-sm text-slate-500">
          Approve or reject each request before the registrar can release the certificate.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="card flex items-center justify-between">
              <div className="space-y-2">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-3 w-56" />
              </div>
              <div className="flex gap-2">
                <div className="skeleton h-8 w-20" />
                <div className="skeleton h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state card">
          <ClipboardCheck className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No Good Moral Certificate requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-900">{r.profiles?.full_name}</p>
                <p className="text-xs text-slate-500">
                  {r.tracking_code} · {r.profiles?.student_number ?? "—"} · {r.profiles?.course ?? "—"}
                </p>
                {r.purpose && <p className="mt-1 text-sm text-slate-600">Purpose: {r.purpose}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`badge ${
                    r.guidance_status === "Approved"
                      ? "bg-emerald-50 text-emerald-700"
                      : r.guidance_status === "Rejected"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {r.guidance_status ?? "Pending"}
                </span>
                {r.guidance_status !== "Approved" && (
                  <button onClick={() => decide(r.id, "Approved")} className="btn-primary">
                    Approve
                  </button>
                )}
                {r.guidance_status !== "Rejected" && (
                  <button onClick={() => decide(r.id, "Rejected")} className="btn-outline">
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
