"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Row = {
  status: string;
  created_at: string;
  copies: number;
  documents: { name: string; fee: number } | null;
  profiles: { full_name: string; course: string | null } | null;
};

type PaymentRow = {
  id: number;
  amount: number;
  status: string;
  created_at: string;
  verified_at: string | null;
  payment_method: string | null;
  requests: {
    tracking_code: string | null;
    documents: { name: string } | null;
    profiles: { full_name: string } | null;
  } | null;
};

const CATEGORIES = [
  { value: "all", label: "All fields" },
  { value: "status", label: "Status" },
  { value: "document", label: "Document type" },
  { value: "requestor", label: "Requestor name" },
  { value: "course", label: "Course" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  "payment verification": "#3b82f6",
  processing: "#8b5cf6",
  "ready for pickup": "#10b981",
  completed: "#22c55e",
  rejected: "#ef4444",
};

const CHART_COLORS = ["#1565C0", "#0D47A1", "#42A5F5", "#1E88E5", "#1257B8", "#90CAF9"];

export default function AnalyticsPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("all");

  useEffect(() => {
    (async () => {
      const [{ data: reqData }, { data: payData }] = await Promise.all([
        supabase
          .from("requests")
          .select("status, created_at, copies, documents(name, fee), profiles(full_name, course)"),
        supabase
          .from("payments")
          .select(
            "id, amount, status, created_at, verified_at, payment_method, requests(tracking_code, documents(name), profiles(full_name))"
          ),
      ]);
      setRows((reqData as unknown as Row[]) ?? []);
      setPayments((payData as unknown as PaymentRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const fields: Record<string, string> = {
        status: r.status ?? "",
        document: r.documents?.name ?? "",
        requestor: r.profiles?.full_name ?? "",
        course: r.profiles?.course ?? "",
      };
      if (category === "all") {
        return Object.values(fields).some((v) => v.toLowerCase().includes(q));
      }
      return (fields[category] ?? "").toLowerCase().includes(q);
    });
  }, [rows, query, category]);

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of filtered) {
      map[r.status] = (map[r.status] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const monthData = useMemo(() => {
    const map: Record<string, { count: number; sortKey: string }> = {};
    for (const r of filtered) {
      const d = new Date(r.created_at);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const sortKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!map[key]) map[key] = { count: 0, sortKey };
      map[key].count++;
    }
    return Object.entries(map)
      .map(([name, { count, sortKey }]) => ({ name, count, sortKey }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ name, count }) => ({ name, count }));
  }, [filtered]);

  const documentData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of filtered) {
      const doc = r.documents?.name ?? "Unknown";
      map[doc] = (map[doc] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const totalCopies = useMemo(() => filtered.reduce((s, r) => s + (r.copies || 0), 0), [filtered]);

  const fmtMoney = (n: number) =>
    `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const verifiedPayments = useMemo(
    () => payments.filter((p) => p.status === "Verified"),
    [payments]
  );

  const totalRevenue = useMemo(
    () => verifiedPayments.reduce((s, p) => s + (p.amount || 0), 0),
    [verifiedPayments]
  );

  const dailyRevenue = useMemo(() => {
    const map: Record<string, { total: number; count: number; sortKey: string }> = {};
    for (const p of verifiedPayments) {
      const d = new Date(p.verified_at ?? p.created_at);
      const dateKey = d.toLocaleDateString("en-PH");
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      if (!map[dateKey]) map[dateKey] = { total: 0, count: 0, sortKey };
      map[dateKey].total += p.amount || 0;
      map[dateKey].count++;
    }
    return Object.entries(map)
      .map(([date, { total, count, sortKey }]) => ({ date, total, count, sortKey }))
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [verifiedPayments]);

  const revenueMonthData = useMemo(() => {
    const map: Record<string, { total: number; sortKey: string }> = {};
    for (const p of verifiedPayments) {
      const d = new Date(p.verified_at ?? p.created_at);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { total: 0, sortKey };
      map[key].total += p.amount || 0;
    }
    return Object.entries(map)
      .map(([name, { total, sortKey }]) => ({ name, total, sortKey }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [verifiedPayments]);

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">Analytics</h2>
        <p className="text-sm text-slate-500">Request volume and demand trends.</p>
      </div>

      <div className="card flex flex-wrap items-center gap-3">
        <input
          className="input flex-1"
          placeholder="Search status, document, requestor, or course…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="input w-auto"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {query && (
          <button onClick={() => setQuery("")} className="btn-outline">
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="mb-4 h-4 w-24 rounded bg-slate-200" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-3 rounded bg-slate-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card text-center">
              <p className="text-sm text-slate-500">Total Requests</p>
              <p className="text-3xl font-bold text-brand-700">{filtered.length}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-slate-500">Document Types</p>
              <p className="text-3xl font-bold text-brand-700">{documentData.length}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-slate-500">Total Copies</p>
              <p className="text-3xl font-bold text-brand-700">{totalCopies}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-slate-500">Total Revenue</p>
              <p className="text-3xl font-bold text-emerald-600" title="From verified payments">
                {fmtMoney(totalRevenue)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-4 font-semibold text-brand-900">By Status</h3>
              {statusData.length === 0 ? (
                <p className="text-sm text-slate-400">No matching results.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(120, statusData.length * 40)}>
                  <BarChart data={statusData} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#EAF3FD" }}
                      contentStyle={{ borderRadius: 8, border: "1px solid #BBDEFB", fontSize: 12 }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                      {statusData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={STATUS_COLORS[entry.name.toLowerCase()] ?? "#1565C0"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h3 className="mb-4 font-semibold text-brand-900">By Month</h3>
              {monthData.length === 0 ? (
                <p className="text-sm text-slate-400">No matching results.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthData} margin={{ left: 0, right: 16 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "#EAF3FD" }}
                      contentStyle={{ borderRadius: 8, border: "1px solid #BBDEFB", fontSize: 12 }}
                    />
                    <Bar dataKey="count" fill="#1565C0" radius={[6, 6, 0, 0]} barSize={32}>
                      {monthData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card lg:col-span-2">
              <h3 className="mb-4 font-semibold text-brand-900">By Document Type</h3>
              {documentData.length === 0 ? (
                <p className="text-sm text-slate-400">No matching results.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(120, documentData.length * 40)}>
                  <BarChart data={documentData} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={180}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#EAF3FD" }}
                      contentStyle={{ borderRadius: 8, border: "1px solid #BBDEFB", fontSize: 12 }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                      {documentData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-4 font-semibold text-brand-900">Revenue by Month</h3>
              {revenueMonthData.length === 0 ? (
                <p className="text-sm text-slate-400">No verified payments yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revenueMonthData} margin={{ left: 0, right: 16 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: "#EAF3FD" }}
                      contentStyle={{ borderRadius: 8, border: "1px solid #BBDEFB", fontSize: 12 }}
                      formatter={(value) => [fmtMoney(Number(value)), "Revenue"]}
                    />
                    <Bar dataKey="total" fill="#059669" radius={[6, 6, 0, 0]} barSize={32}>
                      {revenueMonthData.map((_, i) => (
                        <Cell key={i} fill={["#047857", "#059669", "#10B981", "#34D399", "#6EE7B7"][i % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h3 className="mb-4 font-semibold text-brand-900">Revenue by Day</h3>
              {dailyRevenue.length === 0 ? (
                <p className="text-sm text-slate-400">No verified payments yet.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">Payments</th>
                        <th className="py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyRevenue.map((d) => (
                        <tr key={d.date} className="border-b border-slate-100">
                          <td className="py-2 pr-4 font-medium text-slate-700">{d.date}</td>
                          <td className="py-2 pr-4 text-slate-500">{d.count}</td>
                          <td className="py-2 text-right font-semibold text-emerald-700">
                            {fmtMoney(d.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td className="py-2 pr-4 font-semibold text-brand-900">Total</td>
                        <td className="py-2 pr-4 font-medium text-slate-600">
                          {dailyRevenue.reduce((s, d) => s + d.count, 0)}
                        </td>
                        <td className="py-2 text-right font-bold text-brand-900">
                          {fmtMoney(totalRevenue)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
