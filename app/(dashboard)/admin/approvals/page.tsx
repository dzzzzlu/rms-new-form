"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { UserCheck, UserX } from "lucide-react";

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
  created_at: string;
};

export default function AdminApprovalsPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, student_number, course, contact_number, is_alumni, school_year, created_at")
      .eq("is_active", false)
      .order("created_at", { ascending: true });
    setUsers((data as PendingUser[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    setProcessingId(id);
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: true })
      .eq("id", id);
    if (error) {
      toast.error("Failed to approve user.");
      setProcessingId(null);
      return;
    }
    toast.success("User approved.");
    setProcessingId(null);
    load();
  }

  async function reject(id: string) {
    if (!window.confirm("Are you sure you want to reject this user? They will be removed from the system.")) return;
    setProcessingId(id);
    const res = await fetch("/api/admin/reject-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      toast.error("Failed to reject user: " + (error ?? res.statusText));
      setProcessingId(null);
      return;
    }
    toast.success("User rejected and removed.");
    setProcessingId(null);
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
                  <p className="font-semibold text-brand-900">{u.full_name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
                <span className="badge bg-amber-50 text-amber-700">Pending</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-slate-500">Role</p>
                  <p className="font-medium capitalize">{u.role}</p>
                </div>
                <div>
                  <p className="text-slate-500">Course</p>
                  <p className="font-medium">{u.course ?? "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Student #</p>
                  <p className="font-medium">{u.student_number ?? "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Registered</p>
                  <p className="font-medium">{new Date(u.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {u.is_alumni && (
                <p className="text-xs text-slate-500">Alumni · School Year: {u.school_year ?? "—"}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => approve(u.id)}
                  disabled={processingId === u.id}
                  className="btn-primary flex items-center gap-1"
                >
                  <UserCheck className="h-4 w-4" />
                  {processingId === u.id ? "Processing…" : "Approve"}
                </button>
                <button
                  onClick={() => reject(u.id)}
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
    </div>
  );
}
