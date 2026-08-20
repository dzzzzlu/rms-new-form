"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Papa from "papaparse";
import { BarChart3 } from "lucide-react";

type ReportRow = {
  tracking_code: string;
  status: string;
  created_at: string;
  copies: number;
  documents: { name: string; fee: number } | null;
  profiles: { full_name: string } | null;
};

export default function ReportsPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("requests")
        .select("tracking_code, status, created_at, copies, documents(name, fee), profiles(full_name)")
        .order("created_at", { ascending: false });
      setRows((data as unknown as ReportRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  function downloadCsv() {
    const data = rows.map((r) => ({
      "Tracking Code": r.tracking_code,
      Requestor: r.profiles?.full_name ?? "",
      Document: r.documents?.name ?? "",
      Copies: r.copies,
      Status: r.status,
      Date: new Date(r.created_at).toLocaleDateString(),
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "requests-report.csv";
    a.click();
  }

  const totalRevenue = rows.reduce(
    (sum, r) => sum + (r.status === "Completed" ? (r.documents?.fee ?? 0) * r.copies : 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-brand-900">Reports</h2>
          <p className="text-sm text-slate-500">{rows.length} total requests · ₱{totalRevenue.toFixed(2)} completed revenue</p>
        </div>
        <button onClick={downloadCsv} className="btn-outline">Export CSV</button>
      </div>

      {loading ? (
        <div className="card space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-4 w-28" />
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-4 w-20" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state card">
          <BarChart3 className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No request data yet.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2 pr-4">Tracking</th>
                <th className="py-2 pr-4">Requestor</th>
                <th className="py-2 pr-4">Document</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="table-row border-b border-slate-50">
                  <td className="py-2.5 pr-4">{r.tracking_code}</td>
                  <td className="py-2.5 pr-4">{r.profiles?.full_name}</td>
                  <td className="py-2.5 pr-4">{r.documents?.name}</td>
                  <td className="py-2.5 pr-4">{r.status}</td>
                  <td className="py-2.5 pr-4">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
