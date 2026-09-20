"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { titleCaseName } from "@/lib/validation";
import { toast } from "sonner";

type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  student_number: string | null;
  course: string | null;
  contact_number: string | null;
  is_alumni: boolean;
  school_year: string | null;
  is_active: boolean;
};

const ROLES = ["student", "registrar", "admin", "guidance"];
const COURSES = [
  "BSIT", "BSCS", "BSBA", "BSA", "BSN", "BSED", "AB", "AB PolSci",
  "BS Architecture", "BS Civil Engineering", "BS Electrical Engineering",
  "BS Mechanical Engineering", "BS Marine Engineering", "BS Customs Administration",
];

export default function AdminUsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    loadUsers();
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  async function loadUsers() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, student_number, course, contact_number, is_alumni, school_year, is_active")
      .order("full_name");
    setUsers((data as UserProfile[]) ?? []);
    setLoading(false);
  }

  async function saveUser() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editing.full_name,
        role: editing.role,
        student_number: editing.student_number,
        course: editing.course,
        contact_number: editing.contact_number,
        is_alumni: editing.is_alumni,
        school_year: editing.school_year,
        is_active: editing.is_active,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
      return;
    }
    toast.success("User updated.");
    setEditing(null);
    loadUsers();
  }

  async function toggleActive(id: string, current: boolean) {
    const action = current ? "archive" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    const { error } = await supabase.from("profiles").update({ is_active: !current }).eq("id", id);
    if (error) {
      toast.error("Failed to update user.");
      return;
    }
    toast.success(`User ${action}d.`);
    loadUsers();
  }

  async function deleteUser(u: UserProfile) {
    if (!window.confirm(`Permanently delete ${u.full_name} (${u.email})? Their account and all related data will be removed. This cannot be undone.`)) return;
    setDeletingId(u.id);
    const res = await fetch("/api/admin/reject-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id }),
    });
    setDeletingId(null);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      toast.error("Failed to delete user: " + (error ?? res.statusText));
      return;
    }
    toast.success("User deleted.");
    loadUsers();
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.student_number ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "All" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">Manage Users</h2>
        <p className="text-sm text-slate-500">{users.length} total users</p>
      </div>

      <div className="card flex flex-wrap items-center gap-3">
        <input
          className="input flex-1"
          placeholder="Search by name, email, or student number…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="input w-auto"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option>All</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {paginated.map((u) => (
                <div key={u.id} className="py-3">
                  <p className="font-semibold text-slate-900">{titleCaseName(u.full_name)}</p>
                  <p className="break-all text-sm text-slate-500">{u.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">Student No.: {u.student_number ?? "—"}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize text-slate-600">Role: {u.role}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${u.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {u.is_active ? "Active" : "Archived"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                    <button onClick={() => setEditing(u)} className="py-2 text-sm font-medium text-brand-600">
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(u.id, u.is_active)}
                      className={`py-2 text-sm font-medium ${u.is_active ? "text-red-600" : "text-emerald-600"}`}
                    >
                      {u.is_active ? "Archive" : "Activate"}
                    </button>
                    <button
                      onClick={() => deleteUser(u)}
                      disabled={deletingId === u.id || u.id === me}
                      className="py-2 text-sm font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === u.id ? "Deleting…" : u.id === me ? "You" : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
              {paginated.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">No users found.</p>
              )}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">Student No.</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Role</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-medium text-slate-800">{titleCaseName(u.full_name)}</td>
                      <td className="px-3 py-2.5 text-slate-600">{u.student_number ?? "—"}</td>
                      <td className="px-3 py-2.5 text-slate-600">{u.email}</td>
                      <td className="px-3 py-2.5 capitalize">{u.role}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {u.is_active ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td className="flex gap-2 px-3 py-2.5">
                        <button onClick={() => setEditing(u)} className="text-sm font-medium text-brand-600 hover:underline">Edit</button>
                        <button onClick={() => toggleActive(u.id, u.is_active)} className={`text-sm font-medium hover:underline ${u.is_active ? "text-red-600" : "text-emerald-600"}`}>
                          {u.is_active ? "Archive" : "Activate"}
                        </button>
                        <button
                          onClick={() => deleteUser(u)}
                          disabled={deletingId === u.id || u.id === me}
                          className="text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === u.id ? "Deleting…" : u.id === me ? "You" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary text-xs">Previous</button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-secondary text-xs">Next</button>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto">
            <h3 className="text-lg font-bold text-brand-900">Edit User</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Full Name</label>
                <input className="input" value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Student Number</label>
                <input className="input" value={editing.student_number ?? ""} onChange={(e) => setEditing({ ...editing, student_number: e.target.value })} />
              </div>
              <div>
                <label className="label">Course</label>
                <select className="input" value={editing.course ?? ""} onChange={(e) => setEditing({ ...editing, course: e.target.value || null })}>
                  <option value="">None</option>
                  {COURSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Contact Number</label>
                <input className="input" value={editing.contact_number ?? ""} onChange={(e) => setEditing({ ...editing, contact_number: e.target.value })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input bg-slate-50" value={editing.email} disabled />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="h-4 w-4" />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editing.is_alumni} onChange={(e) => setEditing({ ...editing, is_alumni: e.target.checked })} className="h-4 w-4" />
                  <span className="text-sm">Alumni</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
              <button onClick={saveUser} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
