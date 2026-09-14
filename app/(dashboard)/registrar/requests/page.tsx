"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RequestWithRelations } from "@/lib/types";
import { sendNotification } from "@/lib/notify";
import { Inbox } from "lucide-react";
import { toast } from "sonner";
import PrintDocument, { type PrintDoc } from "@/components/PrintDocument";

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

function formatPickup(d: Date) {
  return d.toLocaleString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function toPrintDoc(r: RequestWithRelations): PrintDoc {
  return {
    docName: r.documents?.name ?? "Document",
    trackingCode: r.tracking_code,
    fullName: r.profiles?.full_name ?? "Student",
    studentNumber: r.profiles?.student_number ?? null,
    course: r.profiles?.course ?? null,
    copies: r.copies,
    status: r.status,
    classList: r.class_list,
    issuedAt: r.created_at,
    contactNumber: r.profiles?.contact_number ?? null,
    email: r.profiles?.email ?? null,
  };
}

export default function ManageRequestsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [pickupRequest, setPickupRequest] = useState<RequestWithRelations | null>(null);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  async function load() {
    setLoading(true);
    const select =
      "id, tracking_code, batch_id, purpose, copies, status, pickup_at, guidance_status, clearance_status, class_list, created_at, user_id, documents(name), profiles(full_name, student_number, course, contact_number, email)";
    let { data, error } = await supabase
      .from("requests")
      .select(select)
      .order("created_at", { ascending: false });
    if (error) {
      const { data: fallback, error: fallbackError } = await supabase
        .from("requests")
        .select(select.replace(", batch_id", "").replace(", pickup_at", ""))
        .order("created_at", { ascending: false });
      if (fallbackError) {
        toast.error("Failed to load requests.");
      } else {
        data = fallback;
      }
    }
    setRequests((data as unknown as RequestWithRelations[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function handleStatusChange(r: RequestWithRelations, status: string) {
    if (status === "Ready for Pickup") {
      if (r.documents?.name === "Good Moral Certificate" && r.guidance_status !== "Approved") {
        toast.error("This Good Moral request hasn't been approved by the Guidance Department yet.");
        return;
      }
      if (r.status === "Ready for Pickup") return;
      setPickupDate("");
      setPickupTime("");
      setPickupRequest(r);
      return;
    }
    updateStatus(r, status);
  }

  async function updateStatus(
    r: RequestWithRelations,
    status: string,
    pickupAt?: string | null,
    scheduleRemarks?: string
  ) {
    if (RELEASE_STATUSES.includes(status)) {
      if (r.documents?.name === "Good Moral Certificate" && r.guidance_status !== "Approved") {
        toast.error("This Good Moral request hasn't been approved by the Guidance Department yet.");
        return;
      }
    }

    if (!window.confirm(`Change "${r.documents?.name}" (${r.tracking_code}) to "${status}"?`)) {
      return;
    }

    setUpdatingId(r.id);
    const { data: me } = await supabase.auth.getUser();
    const patch: Record<string, unknown> = { status };
    if (status === "Ready for Pickup") patch.pickup_at = pickupAt ?? null;
    const { data: updated, error } = await supabase.from("requests").update(patch).eq("id", r.id).select();
    if (error || !updated || updated.length === 0) {
      toast.error("Failed to update status. Make sure your account has the correct role.");
      setUpdatingId(null);
      return;
    }
    await supabase.from("status_history").insert({
      request_id: r.id,
      status,
      remarks: status === "Ready for Pickup" ? scheduleRemarks ?? null : null,
    });

    if (r.user_id && me?.user?.id) {
      const pickupLabel =
        status === "Ready for Pickup" && pickupAt ? formatPickup(new Date(pickupAt)) : "";
      const message =
        status === "Ready for Pickup"
          ? `Your ${r.documents?.name ?? "document"} request (${r.tracking_code}) is ready for pickup. Please claim it on ${pickupLabel}.`
          : `Your ${r.documents?.name ?? "document"} request (${r.tracking_code}) status has been updated to "${status}".`;
      sendNotification({
        senderId: me.user.id,
        receiverId: r.user_id,
        message,
        subject:
          status === "Ready for Pickup"
            ? `Ready for Pickup — ${pickupLabel}`
            : `Request Status Update — ${status}`,
        link: `/student/requests/${r.id}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;"><h2 style="color:#0B3068;">Regis Marie College — Document Request Update</h2><p>Hi ${r.profiles?.full_name ?? "there"},</p>${
          status === "Ready for Pickup"
            ? `<p>Your <strong>${r.documents?.name ?? "document"}</strong> request (<strong>${r.tracking_code}</strong>) is <strong style="color:#4F46E5;">ready for pickup</strong>.</p><p style="background:#EEF2FF;padding:12px;border-radius:8px;"><strong>Pickup schedule:</strong><br/>${pickupLabel}</p>`
            : `<p>Your <strong>${r.documents?.name ?? "document"}</strong> request (<strong>${r.tracking_code}</strong>) has been updated to <strong>${status}</strong>.</p>`
        }<p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message from the Regis Marie College Document Request System.</p></div>`,
      });
    }

    toast.success(`Status changed to "${status}".`);
    setUpdatingId(null);
    setPickupRequest(null);
    load();
  }

  async function confirmPickup() {
    const r = pickupRequest;
    if (!r) return;
    if (!pickupDate || !pickupTime) {
      toast.error("Please set the pickup date and time.");
      return;
    }
    const pickupAt = new Date(`${pickupDate}T${pickupTime}`);
    if (isNaN(pickupAt.getTime()) || pickupAt.getTime() < Date.now()) {
      toast.error("Pickup schedule must be in the future.");
      return;
    }
    const label = formatPickup(pickupAt);
    await updateStatus(r, "Ready for Pickup", pickupAt.toISOString(), `Pickup scheduled on ${label}.`);
  }

  const visible = requests.filter((r) => {
    const matchStatus = filter === "All" || r.status === filter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.profiles?.full_name?.toLowerCase().includes(q) ||
      r.profiles?.student_number?.toLowerCase().includes(q) ||
      r.tracking_code?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const groups = useMemo(() => {
    const map = new Map<string, RequestWithRelations[]>();
    for (const r of visible) {
      const key = r.batch_id ?? `_single_${r.id}`;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.values());
  }, [visible]);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3">
        <input
          className="input flex-1"
          placeholder="Search by name, student number, or tracking code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
        <div className="space-y-6">
          {groups.map((group) => {
            const first = group[0];
            const student = first.profiles;
            return (
              <div key={first.batch_id ?? `single-${first.id}`} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3 pl-1">
                  <div>
                    <p className="text-sm font-semibold text-brand-900">
                      {student?.full_name ?? "Student"} · {group.length} document
                      {group.length !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      {student?.student_number ?? "—"} · {group.map((r) => r.tracking_code).join(" · ")}
                    </p>
                  </div>
                  <PrintDocument docs={group.map(toPrintDoc)} />
                </div>

                <div className="space-y-2">
                  {group.map((r) => (
                    <div key={r.id} className="card space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-brand-900">{r.documents?.name}</p>
                          <p className="text-xs text-slate-500">
                            {r.tracking_code} · copied {r.copies}× ·{" "}
                            {new Date(r.created_at).toLocaleDateString()}
                          </p>
                          {r.status === "Ready for Pickup" && r.pickup_at && (
                            <p className="text-xs font-medium text-indigo-700">
                              Pickup scheduled: {formatPickup(new Date(r.pickup_at))}
                            </p>
                          )}
                        </div>
                        <select
                          className="input w-auto"
                          value={r.status}
                          disabled={updatingId === r.id || (r.status as string) === "Completed" || (r.status as string) === "Rejected"}
                          onChange={(e) => handleStatusChange(r, e.target.value)}
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

                      {r.documents?.name === "Certificate of Enrollment" && r.class_list && (
                        <p className="whitespace-pre-line text-xs text-slate-600">
                          Class list: {r.class_list}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pickupRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-brand-900">Schedule Pickup</h3>
            <p className="mt-1 text-sm text-slate-500">
              {pickupRequest.documents?.name} ({pickupRequest.tracking_code}) will be set to{" "}
              <strong className="text-indigo-700">Ready for Pickup</strong>. Choose the date and time the
              student should claim the document.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Pickup date</label>
                <input
                  type="date"
                  className="input"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Pickup time</label>
                <input
                  type="time"
                  className="input"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setPickupRequest(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={confirmPickup} disabled={updatingId !== null}>
                {updatingId !== null ? "Saving…" : "Confirm Pickup"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}