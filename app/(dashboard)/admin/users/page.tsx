"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/lib/types";
import { Users } from "lucide-react";

const ROLES: readonly UserRole[] = ["student", "registrar", "admin", "guidance"] as const;

export default function ManageUsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers((data as unknown as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setRole(id: string, role: UserRole) {
    await supabase.from("profiles").update({ role }).eq("id", id);
    load();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await supabase.from("profiles").update({ is_active: !isActive }).eq("id", id);
    load();
  }

  const filtered = users
    .filter((u) => (showArchived ? true : u.is_active))
    .filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q.toLowerCase()) ||
        u.email?.toLowerCase().includes(q.toLowerCase())
    );

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
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
          <input
            className="input w-auto"
            placeholder="Search name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
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
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <Users className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No users found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
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
      )}
    </div>
  );
}
