"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ApprovalStatus } from "@/lib/types";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

type GoodMoralRequest = {
  id: number;
  tracking_code: string;
  purpose: string | null;
  guidance_status: ApprovalStatus | null;
  created_at: string;
  user_id: string;
  documents: { name: string } | null;
  profiles: { full_name: string; student_number: string | null; course: string | null } | null;
};

export default function GuidanceApprovalsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<GoodMoralRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("requests")
      .select(
        "id, tracking_code, purpose, guidance_status, created_at, user_id, documents!inner(name), profiles(full_name, student_number, course)"
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
    if (!window.confirm(`${status} this Good Moral Certificate request?`)) return;
    setDecidingId(id);
    const r = requests.find((req) => req.id === id);
    const { error } = await supabase.from("requests").update({ guidance_status: status }).eq("id", id);
    if (error) {
      toast.error("Failed to update approval.");
      setDecidingId(null);
      return;
    }
    await supabase.from("status_history").insert({
      request_id: id,
      status: `Guidance ${status}`,
    });

    if (r?.user_id) {
      const msg = status === "Approved"
        ? "Your Good Moral Certificate has been approved by the Guidance Department and is now being processed."
        : "Your Good Moral Certificate request was not approved by the Guidance Department. Please contact the guidance office for details.";
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: r.user_id,
          subject: `Good Moral Certificate — ${status}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;"><h2 style="color:#0D47A1;">Regis Marie College — Document Request Update</h2><p>Hi ${r.profiles?.full_name ?? "there"},</p><p>Your Good Moral Certificate request (<strong>${r.tracking_code}</strong>) has been <strong>${status.toLowerCase()}</strong> by the Guidance Department.</p><p>${msg}</p><p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message from the Regis Marie College Document Request System.</p></div>`,
        }),
      });
    }

    toast.success(`Request ${status.toLowerCase()}.`);
    setDecidingId(null);
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
                  <button
                    onClick={() => decide(r.id, "Approved")}
                    disabled={decidingId === r.id}
                    className="btn-primary"
                  >
                    {decidingId === r.id ? "..." : "Approve"}
                  </button>
                )}
                {r.guidance_status !== "Rejected" && (
                  <button
                    onClick={() => decide(r.id, "Rejected")}
                    disabled={decidingId === r.id}
                    className="btn-outline"
                  >
                    {decidingId === r.id ? "..." : "Reject"}
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
