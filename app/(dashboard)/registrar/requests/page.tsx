"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RequestWithRelations } from "@/lib/types";
import { sendNotification } from "@/lib/notify";
import { Inbox } from "lucide-react";
import { toast } from "sonner";

const STATUSES = [
  "Pending",
  "Payment Verification",
  "Processing",
  "Ready for Pickup",
  "Completed",
  "Rejected",
] as const;

const RELEASE_STATUSES = ["Ready for Pickup", "Completed"];

function nextStatuses(current: string): readonly string[] {
  if (current === "Pending") return ["Payment Verification", "Processing", "Rejected"];
  if (current === "Payment Verification") return ["Processing", "Rejected"];
  if (current === "Processing") return ["Ready for Pickup", "Completed", "Rejected"];
  if (current === "Ready for Pickup") return ["Completed", "Rejected"];
  if (current === "Completed") return ["Completed"] as const;
  if (current === "Rejected") return ["Rejected"] as const;
  return STATUSES;
}

export default function ManageRequestsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("requests")
      .select(
        "id, tracking_code, purpose, copies, status, guidance_status, clearance_status, class_list, created_at, user_id, documents(name), profiles(full_name, student_number)"
      )
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load requests.");
    }
    setRequests((data as unknown as RequestWithRelations[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(r: RequestWithRelations, status: string) {
    if (RELEASE_STATUSES.includes(status)) {
      if (r.documents?.name === "Good Moral Certificate" && r.guidance_status !== "Approved") {
        toast.error("This Good Moral request hasn't been approved by the Guidance Department yet.");
        return;
      }
      if (r.documents?.name === "Diploma" && r.clearance_status !== "Approved") {
        toast.error("This Diploma request hasn't cleared all offices yet.");
        return;
      }
    }

    if (!window.confirm(`Change "${r.documents?.name}" (${r.tracking_code}) to "${status}"?`)) {
      return;
    }

    setUpdatingId(r.id);
    const { data: me } = await supabase.auth.getUser();
    const { data: updated, error } = await supabase.from("requests").update({ status }).eq("id", r.id).select();
    if (error || !updated || updated.length === 0) {
      toast.error("Failed to update status. Make sure your account has the correct role.");
      setUpdatingId(null);
      return;
    }
    await supabase.from("status_history").insert({ request_id: r.id, status });

    if (r.user_id && me?.user?.id) {
      sendNotification({
        senderId: me.user.id,
        receiverId: r.user_id,
        message: `Your ${r.documents?.name ?? "document"} request (${r.tracking_code}) status has been updated to "${status}".`,
        subject: `Request Status Update — ${status}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;"><h2 style="color:#0B3068;">Regis Marie College — Document Request Update</h2><p>Hi ${r.profiles?.full_name ?? "there"},</p><p>Your <strong>${r.documents?.name ?? "document"}</strong> request (<strong>${r.tracking_code}</strong>) has been updated to <strong>${status}</strong>.</p><p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message from the Regis Marie College Document Request System.</p></div>`,
      });
    }

    toast.success(`Status changed to "${status}".`);
    setUpdatingId(null);
    load();
  }

  async function setClearance(id: number, status: "Approved" | "Rejected") {
    if (!window.confirm(`Mark clearance as ${status}?`)) return;
    const r = requests.find((req) => req.id === id);
    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase.from("requests").update({ clearance_status: status }).eq("id", id);
    if (error) {
      toast.error("Failed to update clearance.");
      return;
    }
    if (r?.user_id && me?.user?.id) {
      sendNotification({
        senderId: me.user.id,
        receiverId: r.user_id,
        message: `Your Diploma request (${r.tracking_code}) clearance has been ${status.toLowerCase()}.`,
        subject: `Diploma Clearance — ${status}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;"><h2 style="color:#0B3068;">Regis Marie College — Document Request Update</h2><p>Hi ${r.profiles?.full_name ?? "there"},</p><p>Your Diploma request (<strong>${r.tracking_code}</strong>) clearance has been marked as <strong>${status}</strong>.</p><p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message from the Regis Marie College Document Request System.</p></div>`,
      });
    }
    toast.success(`Clearance marked as ${status}.`);
    load();
  }

  const visible = filter === "All" ? requests : requests.filter((r) => r.status === filter);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-brand-900">Manage Requests</h2>
          <p className="text-sm text-slate-500">
            {requests.length} total · {filter !== "All" ? visible.length + " shown" : "all"}
          </p>
        </div>
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option>All</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="skeleton h-4 w-48" />
                  <div className="skeleton h-3 w-64" />
                </div>
                <div className="skeleton h-8 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state card">
          <Inbox className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No requests in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <div key={r.id} className="card space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-900">
                    {r.documents?.name} — {r.profiles?.full_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.tracking_code} · {r.profiles?.student_number ?? "—"} ·{" "}
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <select
                  className="input w-auto"
                  value={r.status}
                  disabled={updatingId === r.id || (r.status as string) === "Completed" || (r.status as string) === "Rejected"}
                  onChange={(e) => updateStatus(r, e.target.value)}
                >
                  {nextStatuses(r.status).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              {r.documents?.name === "Good Moral Certificate" && (
                <p className="text-xs">
                  Guidance approval:{" "}
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
                </p>
              )}

              {r.documents?.name === "Diploma" && (
                <div className="flex items-center gap-2 text-xs">
                  <span>Clearance:</span>
                  <span
                    className={`badge ${
                      r.clearance_status === "Approved"
                        ? "bg-emerald-50 text-emerald-700"
                        : r.clearance_status === "Rejected"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {r.clearance_status ?? "Pending"}
                  </span>
                  {r.clearance_status !== "Approved" && (
                    <button onClick={() => setClearance(r.id, "Approved")} className="btn-outline !px-2 !py-1">
                      Mark Cleared
                    </button>
                  )}
                </div>
              )}

              {r.documents?.name === "Certificate of Enrollment" && r.class_list && (
                <p className="whitespace-pre-line text-xs text-slate-600">
                  Class list: {r.class_list}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
