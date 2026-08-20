"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Papa from "papaparse";
import type { Profile } from "@/lib/types";
import { FileText } from "lucide-react";

export default function AdminReportsPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, role, is_active, created_at")
        .order("created_at", { ascending: false });
      setUsers((data as unknown as Profile[]) ?? []);
      setLoading(false);
    })();
  }, []);

  function downloadCsv() {
    const data = users.map((u) => ({
      Name: u.full_name,
      Email: u.email,
      Role: u.role,
      Active: u.is_active ? "Yes" : "No",
      Joined: new Date(u.created_at).toLocaleDateString(),
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users-report.csv";
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-brand-900">Reports</h2>
          <p className="text-sm text-slate-500">{users.length} total accounts</p>
        </div>
        <button onClick={downloadCsv} className="btn-outline">Export CSV</button>
      </div>

      {loading ? (
        <div className="card space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-4 w-12" />
              <div className="skeleton h-4 w-20" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state card">
          <FileText className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No user data yet.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2 pr-4">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} className="table-row border-b border-slate-50">
                  <td className="py-2.5 pr-4">{u.full_name}</td>
                  <td className="py-2.5 pr-4">{u.email}</td>
                  <td className="py-2.5 pr-4">{u.role}</td>
                  <td className="py-2.5 pr-4">{u.is_active ? "Yes" : "No"}</td>
                  <td className="py-2.5 pr-4">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
