"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RequestWithRelations } from "@/lib/types";
import { sendNotification } from "@/lib/notify";
import { printName, titleCaseName } from "@/lib/validation";
import { Search, Inbox, Clock, Check, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import PrintDocument, { type PrintDoc } from "@/components/PrintDocument";
import { useRouter } from "next/navigation";

type Step = { label: string; app: string[] };

const GCASH_STEPS: Step[] = [
  { label: "Received", app: ["Pending", "Payment Verification"] },
  { label: "Processing", app: ["Processing"] },
  { label: "Ready", app: ["Ready for Pickup"] },
  { label: "Released", app: ["Completed"] },
];

const WALKIN_STEPS: Step[] = [
  { label: "Received", app: ["Pending", "Payment Verification"] },
  { label: "Processing", app: ["Processing"] },
  { label: "Released", app: ["Completed"] },
];

const RELEASE_STATUSES = ["Ready for Pickup", "Completed"];

const STATUS_META: Record<string, { color: string; chip: string }> = {
  Pending: { color: "#8b99a7", chip: "bg-slate-100 text-slate-600" },
  "Payment Verification": { color: "#8b99a7", chip: "bg-slate-100 text-slate-600" },
  Processing: { color: "#b4690e", chip: "bg-amber-50 text-amber-700" },
  "Ready for Pickup": { color: "#177a4c", chip: "bg-emerald-50 text-emerald-700" },
  Completed: { color: "#5b6b7c", chip: "bg-slate-200 text-slate-700" },
  Rejected: { color: "#b3261e", chip: "bg-red-50 text-red-700" },
  Cancelled: { color: "#8b99a7", chip: "bg-slate-100 text-slate-600" },
};

const CHIPS: { id: string; label: string; statuses: string[] | null; color: string | null }[] = [
  { id: "All", label: "All", statuses: null, color: null },
  { id: "received", label: "Received", statuses: ["Pending", "Payment Verification"], color: "#8b99a7" },
  { id: "processing", label: "Processing", statuses: ["Processing"], color: "#b4690e" },
  { id: "ready", label: "Ready", statuses: ["Ready for Pickup"], color: "#177a4c" },
  { id: "released", label: "Released", statuses: ["Completed"], color: "#5b6b7c" },
  { id: "rejected", label: "Rejected", statuses: ["Rejected"], color: "#b3261e" },
  { id: "cancelled", label: "Cancelled", statuses: ["Cancelled"], color: null },
];

function resolveChipFromStatus(value: string | null): string {
  if (!value) return "All";
  const id = value.toLowerCase();
  if (CHIPS.some((c) => c.id === id)) return id;
  const title = id.replace(/\b\w/g, (x) => x.toUpperCase());
  const chip = CHIPS.find((c) => c.statuses?.includes(title));
  return chip?.id ?? "All";
}

function isWalkIn(r: RequestWithRelations): boolean {
  return Array.isArray(r.payments) && r.payments.some((p) => p.payment_method === "walk_in");
}

function stepsFor(isWalkIn: boolean) {
  return isWalkIn ? WALKIN_STEPS : GCASH_STEPS;
}

function stepIndexOf(r: RequestWithRelations): number {
  return stepsFor(isWalkIn(r)).findIndex((s) => s.app.includes(r.status));
}

function isTerminal(r: RequestWithRelations): boolean {
  return r.status === "Completed" || r.status === "Rejected" || r.status === "Cancelled";
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

function pickupInfo(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.toDateString());
  const day = new Date(d.toDateString());
  const days = Math.round((day.getTime() - today.getTime()) / 864e5);
  const time = d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  const date = d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
  if (days < 0) return { when: "overdue" as const, text: `Overdue — was ${date}, ${time}` };
  if (days === 0) return { when: "today" as const, text: `Pickup today, ${time}` };
  if (days === 1) return { when: "soon" as const, text: `Pickup tomorrow, ${time}` };
  return { when: "later" as const, text: `Pickup ${date}, ${time}` };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function nextStepAction(r: RequestWithRelations): { label: string; status: string } | null {
  if (isTerminal(r)) return null;
  const walkin = isWalkIn(r);
  if (r.status === "Pending" || r.status === "Payment Verification") {
    return { label: "Mark processing", status: "Processing" };
  }
  if (r.status === "Processing") {
    return walkin ? { label: "Mark released", status: "Completed" } : { label: "Mark ready", status: "Ready for Pickup" };
  }
  if (r.status === "Ready for Pickup") return { label: "Mark released", status: "Completed" };
  return null;
}

function toPrintDoc(r: RequestWithRelations): PrintDoc {
  return {
    docName: r.documents?.name ?? "Document",
    trackingCode: r.tracking_code,
    fullName: printName(
      r.profiles?.first_name,
      r.profiles?.middle_name,
      r.profiles?.last_name,
      r.profiles?.full_name ?? "Student"
    ),
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

type PickupTarget = { r: RequestWithRelations };

export default function ManageRequests() {
  const supabase = createClient();
  const router = useRouter();
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [pickupTarget, setPickupTarget] = useState<PickupTarget | null>(null);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
const [rejectTarget, setRejectTarget] = useState<RequestWithRelations | null>(null);
const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setFilter(resolveChipFromStatus(q.get("status")));
    if (q.get("doc")) setSearch(q.get("doc")!);
    if (q.get("course")) setCourseFilter(q.get("course")!);
    if (q.get("from")) setDateFrom(q.get("from")!);
    if (q.get("to")) setDateTo(q.get("to")!);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter && filter !== "All") params.set("status", filter);
    if (courseFilter) params.set("course", courseFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (search) params.set("doc", search);
    const qs = params.toString();
    router.replace(window.location.pathname + (qs ? `?${qs}` : ""), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, courseFilter, dateFrom, dateTo, search]);

  function clearFilters() {
    setFilter("All");
    setSearch("");
    setCourseFilter("");
    setDateFrom("");
    setDateTo("");
    router.replace(window.location.pathname, { scroll: false });
  }

  const activeFilterCount = (filter !== "All" ? 1 : 0) + (courseFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);

  const load = useCallback(async () => {
    setLoading(true);
    const select =
      "id, tracking_code, batch_id, purpose, copies, status, pickup_at, guidance_status, clearance_status, class_list, created_at, user_id, documents(name), payments(payment_method), profiles(full_name, first_name, middle_name, last_name, student_number, course, contact_number, email)";
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
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "/" && target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
        e.preventDefault();
        document.getElementById("request-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function guidanceBlocked(r: RequestWithRelations, status: string): boolean {
    if (
      RELEASE_STATUSES.includes(status) &&
      r.documents?.name === "Good Moral Certificate" &&
      r.guidance_status !== "Approved"
    ) {
      toast.error("This Good Moral request hasn't been approved by the Guidance Department yet.");
      return true;
    }
    return false;
  }

  async function updateStatus(
    r: RequestWithRelations,
    status: string,
    pickupAt?: string | null,
    remarks?: string,
    skipConfirm?: boolean
  ) {
    if (guidanceBlocked(r, status)) return;

    if (!skipConfirm) {
      const confirmMsg =
        status === "Completed"
          ? `Mark "${r.documents?.name}" (${r.tracking_code}) as Completed? Confirm you have already handed the document to the student.`
          : `Change "${r.documents?.name}" (${r.tracking_code}) to "${status}"?`;
      if (!window.confirm(confirmMsg)) return;
    }

    setUpdatingId(r.id);
    const { data: me } = await supabase.auth.getUser();
    const patch: Record<string, unknown> = { status };
    if (status === "Ready for Pickup") patch.pickup_at = pickupAt ?? null;
    if (remarks) patch.remarks = remarks;
    let { data: updated, error } = await supabase.from("requests").update(patch).eq("id", r.id).select();
    if (error && status === "Ready for Pickup") {
      const retry = await supabase.from("requests").update({ status }).eq("id", r.id).select();
      updated = retry.data;
      error = retry.error;
    }
    if (error || !updated || updated.length === 0) {
      toast.error("Failed to update status. Make sure your account has the correct role.");
      setUpdatingId(null);
      return;
    }
    await supabase.from("status_history").insert({
      request_id: r.id,
      status,
      remarks: remarks ?? null,
    });

    if (r.user_id && me?.user?.id) {
      const pickupLabel =
        status === "Ready for Pickup" && pickupAt ? formatPickup(new Date(pickupAt)) : "";
      const isDecline = status === "Rejected" || status === "Cancelled";
      const message =
        status === "Ready for Pickup"
          ? pickupLabel
            ? `Your ${r.documents?.name ?? "document"} request (${r.tracking_code}) is ready for pickup. Please claim it on ${pickupLabel}.`
            : `Your ${r.documents?.name ?? "document"} request (${r.tracking_code}) is ready for pickup. Please coordinate with the registrar's office.`
          : isDecline
          ? `Your ${r.documents?.name ?? "document"} request (${r.tracking_code}) has been ${status.toLowerCase()}.${remarks ? ` Reason: ${remarks}` : ""}`
          : `Your ${r.documents?.name ?? "document"} request (${r.tracking_code}) status has been updated to "${status}".`;
      sendNotification({
        senderId: me.user.id,
        receiverId: r.user_id,
        message,
        subject:
          status === "Ready for Pickup"
            ? `Ready for Pickup${pickupLabel ? ` — ${pickupLabel}` : ""}`
            : isDecline
            ? `Request ${status} — ${r.tracking_code}`
            : `Request Status Update — ${status}`,
        link: `/student/requests/${r.id}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;"><h2 style="color:#0B3068;">Regis Marie College — Document Request Update</h2><p>Hi ${r.profiles?.full_name ?? "there"},</p>${
          status === "Ready for Pickup"
            ? `<p>Your <strong>${r.documents?.name ?? "document"}</strong> request (<strong>${r.tracking_code}</strong>) is <strong style="color:#4F46E5;">ready for pickup</strong>.</p>${
                pickupLabel
                  ? `<p style="background:#EEF2FF;padding:12px;border-radius:8px;"><strong>Pickup schedule:</strong><br/>${pickupLabel}</p>`
                  : `<p>Please coordinate with the registrar's office for pickup details.</p>`
              }`
            : isDecline
            ? `<p>Your <strong>${r.documents?.name ?? "document"}</strong> request (<strong>${r.tracking_code}</strong>) has been <strong>${status.toLowerCase()}</strong>.</p>${
                remarks
                  ? `<p style="background:#FEF2F2;border-radius:8px;padding:12px;color:#B91C1C;"><strong>Reason:</strong><br/>${remarks}</p>`
                  : ""
              }`
            : `<p>Your <strong>${r.documents?.name ?? "document"}</strong> request (<strong>${r.tracking_code}</strong>) has been updated to <strong>${status}</strong>.</p>`
        }<p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message from the Regis Marie College Document Request System.</p></div>`,
      });
    }

    setUpdatingId(null);
    toast.success(`Status changed to "${status}".`);
    load();
    return true;
  }

  function openPickupModal(r: RequestWithRelations) {
    if (guidanceBlocked(r, "Ready for Pickup")) return;
    setPickupDate("");
    setPickupTime("");
    setPickupTarget({ r });
  }

  function openReject(r: RequestWithRelations) {
    setRejectReason("");
    setRejectTarget(r);
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error(`Please enter a reason for ${isWalkIn(rejectTarget) ? "cancelling" : "rejecting"}.`);
      return;
    }
    const status = isWalkIn(rejectTarget) ? "Cancelled" : "Rejected";
    await updateStatus(rejectTarget, status, null, reason, true);
    setRejectTarget(null);
    setRejectReason("");
  }

  function handleStepClick(r: RequestWithRelations, stepIndex: number) {
    const steps = stepsFor(isWalkIn(r));
    const target = steps[stepIndex].app[0];
    const currentIdx = stepIndexOf(r);
    if (currentIdx === stepIndex || target === r.status) return;
    if (target === "Ready for Pickup") {
      openPickupModal(r);
      return;
    }
    updateStatus(r, target);
  }

  function handleNext(r: RequestWithRelations) {
    const action = nextStepAction(r);
    if (!action) return;
    if (action.status === "Ready for Pickup") {
      openPickupModal(r);
      return;
    }
    updateStatus(r, action.status);
  }

  async function verifyPickupSchedule() {
    if (!pickupTarget) return;
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
    const r = pickupTarget.r;
    if (guidanceBlocked(r, "Ready for Pickup")) return;
    await supabase
      .from("requests")
      .update({ status: "Ready for Pickup", pickup_at: pickupAt.toISOString() })
      .eq("id", r.id);
    await supabase.from("status_history").insert({
      request_id: r.id,
      status: "Ready for Pickup",
      remarks: `Pickup scheduled on ${label}.`,
    });
    const { data: me } = await supabase.auth.getUser();
    if (r.user_id && me?.user?.id) {
      sendNotification({
        senderId: me.user.id,
        receiverId: r.user_id,
        message: `Your ${r.documents?.name ?? "document"} request (${r.tracking_code}) is ready for pickup. Please claim it on ${label}.`,
        subject: `Ready for Pickup — ${label}`,
        link: `/student/requests/${r.id}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;"><h2 style="color:#0B3068;">Regis Marie College — Ready for Pickup</h2><p>Hi ${r.profiles?.full_name ?? "there"},</p><p>Your <strong>${r.documents?.name ?? "document"}</strong> request (<strong>${r.tracking_code}</strong>) is <strong style="color:#4F46E5;">ready for pickup</strong>.</p><p style="background:#EEF2FF;padding:12px;border-radius:8px;"><strong>Pickup schedule:</strong><br/>${label}</p><p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message from the Regis Marie College Document Request System.</p></div>`,
      });
    }
    toast.success(`"${r.documents?.name}" set to Ready for Pickup — ${label}. Mark it Completed once the student picks it up.`);
    setPickupTarget(null);
    load();
  }

  const counts = useMemo(() => {
    const base: Record<string, number> = { All: requests.length };
    for (const chip of CHIPS) {
      if (chip.id === "All") continue;
      base[chip.id] = requests.filter((r) => chip.statuses!.includes(r.status)).length;
    }
    return base;
  }, [requests]);

  const visible = useMemo(() => {
    const chip = CHIPS.find((c) => c.id === filter);
    const q = search.toLowerCase();
    return requests.filter((r) => {
      if (chip?.statuses && !chip.statuses.includes(r.status)) return false;
      if (courseFilter && r.profiles?.course !== courseFilter) return false;
      if (dateFrom || dateTo) {
        const day = (r.created_at ?? "").slice(0, 10);
        if (dateFrom && day < dateFrom) return false;
        if (dateTo && day > dateTo) return false;
      }
      if (!q) return true;
      const hay = `${r.profiles?.full_name ?? ""} ${r.profiles?.student_number ?? ""} ${r.tracking_code ?? ""} ${r.documents?.name ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [requests, filter, search, courseFilter, dateFrom, dateTo]);

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

  const openCount = requests.filter((r) => !["Completed", "Rejected", "Cancelled"].includes(r.status)).length;
  const awaitingCount = requests.filter((r) => r.status === "Ready for Pickup").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="request-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, student number, or tracking code"
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-12 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 border-b-2 px-1.5 py-0.5 text-[11px] text-slate-400 sm:block">
            /
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id)}
              aria-pressed={filter === chip.id}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                filter === chip.id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-800"
              }`}
            >
              {chip.color && <span className="h-2 w-2 rounded-sm" style={{ background: chip.color }} />}
              {chip.label}
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  filter === chip.id ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[chip.id]}
              </span>
            </button>
          ))}
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-[13px] text-brand-800">
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            <span className="font-medium">Filtered view:</span>
            {filter !== "All" && (
              <span className="rounded-full bg-white px-2 py-0.5 font-semibold">{CHIPS.find((c) => c.id === filter)?.label}</span>
            )}
            {courseFilter && (
              <span className="rounded-full bg-white px-2 py-0.5">Course: {courseFilter}</span>
            )}
            {(dateFrom || dateTo) && (
              <span className="rounded-full bg-white px-2 py-0.5">
                {dateFrom ? new Date(dateFrom + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : "…"} to{" "}
                {dateTo ? new Date(dateTo + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : "…"}
              </span>
            )}
            <button onClick={clearFilters} className="ml-auto text-[13px] font-semibold text-brand-800 underline underline-offset-2">
              Clear filters
            </button>
          </div>
        )}

        {!loading && (
          <p className="text-[13px] text-slate-500">
            <span className="font-semibold text-brand-700">{openCount}</span> open ·{" "}
            <span className="font-semibold text-emerald-700">{awaitingCount}</span> awaiting pickup
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="skeleton h-4 w-48" />
                  <div className="skeleton h-8 w-28" />
                </div>
                <div className="skeleton h-3 w-72" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <h2 className="text-base font-semibold text-slate-800">Nothing matches that</h2>
          <p className="mt-1 text-sm text-slate-500">
            Try a different tracking code, or clear the status/date filters to see the full queue.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const first = group[0];
            const student = first.profiles;
            return (
              <section key={first.batch_id ?? `single-${first.id}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-3">
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-50 text-[12.5px] font-bold text-brand-700">
                    {initials(student?.full_name ?? "U")}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{titleCaseName(student?.full_name ?? "Student")}</div>
                    <div className="flex flex-wrap gap-x-2.5 text-[12.5px] text-slate-500">
                      <span>{student?.student_number ?? "—"}</span>
                      <span className="font-mono">{first.batch_id ?? first.tracking_code}</span>
                      <span>
                        {group.length} document{group.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <span className="flex-1" />
                  <PrintDocument docs={group.map(toPrintDoc)} variant="registrar" />
                  <span className="sr-only">Print claim slips</span>
                </div>

                {group.map((r) => {
                  const walkin = isWalkIn(r);
                  const steps = stepsFor(walkin);
                  const idx = stepIndexOf(r);
                  const meta = STATUS_META[r.status] ?? STATUS_META.Pending;
                  const p = r.pickup_at
                    ? pickupInfo(r.pickup_at)
                    : null;
                  const next = nextStepAction(r);
                  return (
                    <article key={r.id} className="border-t border-slate-200 first:border-t-0">
                      <div className="flex items-start gap-3">
                        <span className="h-full w-1 flex-none self-stretch" style={{ background: meta.color }} />
                        <div className="min-w-0 flex-1 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">{r.documents?.name}</h3>
                            {walkin && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                Walk-in
                              </span>
                            )}
                            {r.status === "Rejected" && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${meta.chip}`}>Rejected</span>
                            )}
                            {r.status === "Cancelled" && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${meta.chip}`}>Cancelled</span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-slate-500">
                            <span className="font-mono">{r.tracking_code}</span>
                            <span className="text-slate-300">•</span>
                            <span>
                              {r.copies} cop{r.copies > 1 ? "ies" : "y"}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span>
                              Requested {new Date(r.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                            </span>
                          </div>

                          {p && (
                            <div
                              className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-medium ${
                                p.when === "overdue" || p.when === "today"
                                  ? "bg-red-50 text-red-700"
                                  : p.when === "soon"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              <Clock className="h-3.5 w-3.5" />
                              {p.text}
                            </div>
                          )}

                          {r.documents?.name === "Good Moral Certificate" && (
                            <p className="mt-2 text-xs text-slate-500">
                              Guidance approval:{" "}
                              <span className={`badge ${r.guidance_status === "Approved" ? "bg-emerald-50 text-emerald-700" : r.guidance_status === "Rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                                {r.guidance_status ?? "Pending"}
                              </span>
                            </p>
                          )}
                          {r.documents?.name === "Certificate of Enrollment" && r.class_list && (
                            <p className="mt-2 whitespace-pre-line text-xs text-slate-600">Class list: {r.class_list}</p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2.5 py-4 pr-4">
                          <div className="inline-flex items-center gap-0 rounded-full bg-slate-100 p-1">
                            {steps.map((s, i) => {
                              const isCurrent = i === idx;
                              const done = idx > i;
                              const label = i === idx ? r.status : s.label;
                              return (
                                <button
                                  key={s.label}
                                  onClick={() => handleStepClick(r, i)}
                                  disabled={updatingId !== null || isCurrent}
                                  aria-current={isCurrent}
                                  data-done={done || undefined}
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
                                    isCurrent
                                      ? "bg-white text-slate-900 shadow-sm"
                                      : done
                                      ? "text-slate-500 hover:text-slate-800"
                                      : "text-slate-400 hover:text-slate-700"
                                  } disabled:cursor-default`}
                                >
                                  {done && <Check className="h-3 w-3 text-emerald-600" strokeWidth={3} />}
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {(r.status === "Processing" || r.status === "Ready for Pickup") && !walkin && (
                              <button
                                onClick={() => openPickupModal(r)}
                                disabled={updatingId !== null}
                                className="rounded-lg border border-transparent px-2 py-1 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
                              >
                                Reschedule
                              </button>
                            )}
                            {next && (
                              <button
                                onClick={() => handleNext(r)}
                                disabled={updatingId !== null}
                                className="rounded-lg bg-brand-600 px-3 py-1 text-[13px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                              >
                                {next.label}
                              </button>
                            )}
                            {!isTerminal(r) && (
                              <button
                                onClick={() => openReject(r)}
                                disabled={updatingId !== null}
                                className="rounded-lg border border-transparent px-2 py-1 text-[13px] font-medium text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                              >
                                {walkin ? "Cancel" : "Reject"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}

      {pickupTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Schedule Pickup</h3>
            <p className="mt-1 text-sm text-slate-500">
              {pickupTarget.r.documents?.name} ({pickupTarget.r.tracking_code}) will be set to Ready for Pickup.{" "}
              You mark it{" "}
              <strong className="text-emerald-700">Completed</strong> only after the document has been handed to the student.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Pickup date</label>
                <input type="date" className="input" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Pickup time</label>
                <input type="time" className="input" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button className="btn-outline px-3 py-2 text-xs" onClick={() => setPickupTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={verifyPickupSchedule} disabled={updatingId !== null}>
                {updatingId !== null ? "Saving…" : "Save Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              {isWalkIn(rejectTarget) ? "Cancel request" : "Reject request"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Enter the reason for {isWalkIn(rejectTarget) ? "cancelling" : "rejecting"}{" "}
              <strong>{rejectTarget.documents?.name}</strong> ({rejectTarget.tracking_code}). It will be
              emailed to the student and shown on their request page.
            </p>
            <div className="mt-4">
              <label className="label">Reason</label>
              <textarea
                className="input min-h-[90px]"
                placeholder="e.g. Requirements not met, duplicate request, unpaid balance..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                autoFocus
              />
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                className="btn-outline px-3 py-2 text-xs"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                disabled={updatingId !== null}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmReject}
                disabled={!rejectReason.trim() || updatingId !== null}
              >
                {updatingId !== null ? "Saving…" : isWalkIn(rejectTarget) ? "Confirm Cancel" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}