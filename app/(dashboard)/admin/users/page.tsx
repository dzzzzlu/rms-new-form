"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/lib/types";
import { Users } from "lucide-react";
import { toast } from "sonner";

const ROLES: readonly UserRole[] = ["student", "registrar", "admin", "guidance"] as const;

const PAGE_SIZE = 20;

export default function ManageUsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(0);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to load users.");
    setUsers((data as unknown as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setRole(id: string, role: UserRole) {
    if (!window.confirm(`Change this user's role to "${role}"?`)) return;
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) {
      toast.error("Failed to update role.");
      return;
    }
    toast.success(`Role changed to "${role}".`);
    load();
  }

  async function toggleActive(id: string, isActive: boolean) {
    if (!window.confirm(isActive ? "Archive this user?" : "Restore this user?")) return;
    const { error } = await supabase.from("profiles").update({ is_active: !isActive }).eq("id", id);
    if (error) {
      toast.error("Failed to update user.");
      return;
    }
    toast.success(isActive ? "User archived." : "User restored.");
    load();
  }

  const filtered = users
    .filter((u) => (showArchived ? true : u.is_active))
    .filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q.toLowerCase()) ||
        u.email?.toLowerCase().includes(q.toLowerCase())
    );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-brand-900">Manage Users</h2>
          <p className="text-sm text-slate-500">
            {users.filter((u) => u.is_active).length} active ·{" "}
            {users.filter((u) => !u.is_active).length} archived
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => { setShowArchived(e.target.checked); setPage(0); }}
            />
            Show archived
          </label>
          <input
            className="input w-auto"
            placeholder="Search name or email…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card flex items-center justify-between">
              <div className="space-y-2">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-3 w-56" />
              </div>
              <div className="flex gap-2">
                <div className="skeleton h-8 w-24" />
                <div className="skeleton h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : paged.length === 0 ? (
        <div className="empty-state card">
          <Users className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No users found.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paged.map((u) => (
              <div key={u.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-900">
                    {u.full_name}{" "}
                    {!u.is_active && (
                      <span className="badge ml-1 bg-slate-100 text-slate-500">Archived</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {u.email} {u.student_number ? `· ${u.student_number}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="input w-auto"
                    value={u.role}
                    onChange={(e) => setRole(u.id, e.target.value as UserRole)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => toggleActive(u.id, u.is_active)}
                    className={u.is_active ? "btn-outline" : "btn-primary"}
                  >
                    {u.is_active ? "Archive" : "Restore"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="btn-outline !px-3 !py-1 text-sm">
                Prev
              </button>
              <span className="text-sm text-slate-500">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="btn-outline !px-3 !py-1 text-sm">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
