"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { UserCheck, UserX, FileText, ExternalLink, Loader2 } from "lucide-react";
import { sendEmailJS } from "@/lib/emailjs";
import { accountApproved, accountRejected } from "@/lib/email-templates";
import { titleCaseName } from "@/lib/validation";

type PendingUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  student_number: string | null;
  course: string | null;
  contact_number: string | null;
  is_alumni: boolean;
  school_year: string | null;
  year_level: string | null;
  enrollment_status: string | null;
  created_at: string;
  verification_doc_path: string | null;
  verification_doc_name: string | null;
};

export default function AdminApprovalsPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingUser | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, student_number, course, contact_number, is_alumni, school_year, year_level, enrollment_status, created_at, verification_doc_path, verification_doc_name")
      .eq("is_active", false)
      .order("created_at", { ascending: true });
    setUsers((data as PendingUser[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function viewDoc(u: PendingUser) {
    if (!u.verification_doc_path) return;
    setOpeningId(u.id);
    const { data, error } = await supabase.storage
      .from("verification-docs")
      .createSignedUrl(u.verification_doc_path, 3600);
    setOpeningId(null);
    if (error || !data?.signedUrl) {
      toast.error("Could not open the document.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function approve(u: PendingUser) {
    setProcessingId(u.id);
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: true })
      .eq("id", u.id);
    if (error) {
      toast.error("Failed to approve user.");
      setProcessingId(null);
      return;
    }

    // Tell the student their account is ready
    await supabase.from("notifications").insert({
      user_id: u.id,
      message: "Your account has been approved. You can now sign in and request documents.",
      link: "/student/dashboard",
    });

    try {
      await sendEmailJS({
        to: u.email,
        subject: "Account Approved — Regis Marie College",
        html: accountApproved(u.full_name),
      });
    } catch (err) {
      console.error("Approval email error:", err);
    }

    toast.success(`${u.full_name} has been approved.`);
    setProcessingId(null);
    load();
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("Please enter a reason for rejecting this account.");
      return;
    }
    const u = rejectTarget;
    setProcessingId(u.id);

    try {
      await sendEmailJS({
        to: u.email,
        subject: "Account Registration — Regis Marie College",
        html: accountRejected(u.full_name, reason),
      });
    } catch (err) {
      console.error("Rejection email error:", err);
    }

    const res = await fetch("/api/admin/reject-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      toast.error("Failed to reject user: " + (error ?? res.statusText));
      setProcessingId(null);
      return;
    }
    toast.success("User rejected and removed.");
    setProcessingId(null);
    setRejectTarget(null);
    setRejectReason("");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">Pending Approvals</h2>
        <p className="text-sm text-slate-500">
          Approve or reject new student/alumni accounts before they can access the system.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card space-y-3">
              <div className="skeleton h-4 w-48" />
              <div className="skeleton h-3 w-64" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state card">
          <UserCheck className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No pending approvals. All accounts are up to date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-900">{titleCaseName(u.full_name)}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
                <span className="badge bg-amber-50 text-amber-700">Pending</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-slate-500">Status</p>
                  <p className="font-medium">{u.enrollment_status ?? "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Course</p>
                  <p className="font-medium">{u.course ?? "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Year Level</p>
                  <p className="font-medium">{u.year_level ?? "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Student #</p>
                  <p className="font-medium">{u.student_number ?? "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Mobile</p>
                  <p className="font-medium">{u.contact_number ?? "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Registered</p>
                  <p className="font-medium">{new Date(u.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <FileText className="h-4 w-4 shrink-0 text-brand-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">Verification document</p>
                  <p className="truncate text-sm font-medium text-slate-700">
                    {u.verification_doc_name ?? "No document uploaded"}
                  </p>
                </div>
                {u.verification_doc_path && (
                  <button
                    type="button"
                    onClick={() => viewDoc(u)}
                    disabled={openingId === u.id}
                    className="btn-outline flex flex-none items-center gap-1 text-xs"
                  >
                    {openingId === u.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5" />
                    )}
                    View
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => approve(u)}
                  disabled={processingId === u.id}
                  className="btn-primary flex items-center gap-1"
                >
                  <UserCheck className="h-4 w-4" />
                  {processingId === u.id ? "Processing…" : "Approve"}
                </button>
                <button
                  onClick={() => {
                    setRejectReason("");
                    setRejectTarget(u);
                  }}
                  disabled={processingId === u.id}
                  className="btn-outline flex items-center gap-1 text-red-600 hover:bg-red-50"
                >
                  <UserX className="h-4 w-4" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Reject account</h3>
            <p className="mt-1 text-sm text-slate-500">
              Enter the reason for rejecting <strong>{titleCaseName(rejectTarget.full_name)}</strong> (
              {rejectTarget.email}). The reason will be emailed to the applicant and the account will be
              removed.
            </p>
            <div className="mt-4">
              <label className="label">Reason for rejection</label>
              <textarea
                className="input min-h-[90px]"
                placeholder="e.g. Verification document is unreadable, details don't match our records..."
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
                disabled={processingId !== null}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmReject}
                disabled={!rejectReason.trim() || processingId !== null}
              >
                {processingId !== null ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
