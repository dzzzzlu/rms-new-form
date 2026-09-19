"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search } from "lucide-react";

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
  reference_number?: string;
  created_at: string;
  verified_at: string | null;
  payment_method: string | null;
  requests: {
    tracking_code: string | null;
    documents: { name: string } | null;
    profiles: { full_name: string } | null;
  } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  "payment verification": "#3b82f6",
  processing: "#8b5cf6",
  "ready for pickup": "#10b981",
  completed: "#22c55e",
  rejected: "#ef4444",
  cancelled: "#64748b",
};

const DOC_COLORS = [
  "#0b3d91",
  "#1565c0",
  "#42a5f5",
  "#1e88e5",
  "#0d5bb5",
  "#90caf9",
  "#5c8fd6",
  "#1976d2",
];

const SEARCH_FIELDS = [
  { value: "all", label: "All fields" },
  { value: "receipt", label: "Receipt no." },
  { value: "requestor", label: "Requestor" },
  { value: "document", label: "Document" },
  { value: "method", label: "Method" },
  { value: "tracking", label: "Tracking" },
] as const;

type SearchField = (typeof SEARCH_FIELDS)[number]["value"];

const peso = (n: number) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const niceMax = (v: number) => {
  const x = v || 1;
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  return Math.ceil(x / p / (x / p > 5 ? 2 : 1)) * p * (x / p > 5 ? 2 : 1);
};

const titleCaseStatus = (s: string) =>
  s
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

const shortNum = (v: number) =>
  v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k" : String(v);

function ColumnChart({
  items,
  format,
  green = false,
}: {
  items: { label: string; value: number }[];
  format?: (v: number) => string;
  green?: boolean;
}) {
  const max = niceMax(Math.max(...items.map((i) => i.value)));
  const ticks = [0, 1, 2, 3, 4].map((i) => Math.round((max / 4) * i));
  return (
    <div>
      <div
        className="relative h-44 border-b border-[#8494ab]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to top, #e2e8f1 0 1px, transparent 1px 25%)",
        }}
      >
        <div className="absolute inset-y-0 left-0 flex flex-col justify-between text-[11px] text-[#8494ab] tabular-nums">
          {ticks.map((t, i) => (
            <span
              key={t}
              className={i === 0 ? "-translate-y-full" : i === ticks.length - 1 ? "translate-y-1/2" : "-translate-y-1/2"}
            >
              {format ? format(t) : t}
            </span>
          ))}
        </div>
        <div className="absolute inset-0 flex items-end justify-around gap-5 pl-7">
          {items.map((i) => (
            <div
              key={i.label}
              className="flex h-full max-w-[90px] flex-1 flex-col items-center justify-end"
            >
              <span className="mb-1.5 text-xs font-semibold text-[#0d2240] tabular-nums">
                {format ? format(i.value) : i.value}
              </span>
              <div
                className={`min-h-[3px] w-full rounded-t-lg ${green ? "bg-[#00875a]" : "bg-[#0d47a1]"}`}
                style={{ height: `${Math.max(3, (i.value / max) * 100)}%` }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-5 pl-7 pr-1">
        {items.map((i) => (
          <span key={i.label} className="max-w-[90px] flex-1 truncate text-center text-xs text-[#4a5b75]">
            {i.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function arc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(r1, a0);
  const [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1);
  const [x3, y3] = p(r0, a0);
  return `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`;
}

export default function AnalyticsPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const today = new Date();
  const [revGranularity, setRevGranularity] = useState<"day" | "month" | "year">("month");
  const [revYear, setRevYear] = useState<string>(String(today.getFullYear()));
  const [revMonth, setRevMonth] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  );
  const [revDay, setRevDay] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`
  );

  useEffect(() => {
    (async () => {
      const [{ data: reqData }, { data: payData }] = await Promise.all([
        supabase
          .from("requests")
          .select("status, created_at, copies, documents(name, fee), profiles(full_name, course)"),
        supabase
          .from("payments")
          .select(
            "id, amount, status, reference_number, created_at, verified_at, payment_method, requests(tracking_code, documents(name), profiles(full_name))"
          ),
      ]);
      setRows((reqData as unknown as Row[]) ?? []);
      setPayments((payData as unknown as PaymentRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) map[r.status] = (map[r.status] ?? 0) + 1;
    return Object.entries(map)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const pendingCount = useMemo(
    () => rows.filter((r) => r.status === "pending").length,
    [rows]
  );

  const monthData = useMemo(() => {
    const map: Record<string, { count: number; sortKey: string }> = {};
    for (const r of rows) {
      const d = new Date(r.created_at);
      const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      const sortKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!map[key]) map[key] = { count: 0, sortKey };
      map[key].count++;
    }
    return Object.entries(map)
      .map(([label, { count, sortKey }]) => ({ label, count, sortKey }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ label, count }) => ({ label, value: count }));
  }, [rows]);

  const documentData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const doc = r.documents?.name ?? "Unknown";
      map[doc] = (map[doc] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([name, count], i) => ({ name, count, color: DOC_COLORS[i % DOC_COLORS.length] }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const totalCopies = useMemo(() => rows.reduce((s, r) => s + (r.copies || 0), 0), [rows]);

  const verifiedPayments = useMemo(
    () => payments.filter((p) => p.status === "Verified"),
    [payments]
  );

  const totalRevenue = useMemo(
    () => verifiedPayments.reduce((s, p) => s + (p.amount || 0), 0),
    [verifiedPayments]
  );

  const paymentsInPeriod = useMemo(
    () =>
      verifiedPayments.filter((p) => {
        const d = new Date(p.verified_at ?? p.created_at);
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (revGranularity === "day") return dayKey === revDay;
        if (revGranularity === "month") return monthKey === revMonth;
        return String(d.getFullYear()) === revYear;
      }),
    [verifiedPayments, revGranularity, revDay, revMonth, revYear]
  );

  const sectionTotal = useMemo(
    () => paymentsInPeriod.reduce((s, p) => s + (p.amount || 0), 0),
    [paymentsInPeriod]
  );

  const displayYear =
    revGranularity === "day"
      ? revDay.slice(0, 4)
      : revGranularity === "month"
      ? revMonth.slice(0, 4)
      : revYear;

  const revenueMonthData = useMemo(() => {
    const map: Record<string, { total: number; sortKey: string }> = {};
    for (const p of verifiedPayments) {
      const d = new Date(p.verified_at ?? p.created_at);
      if (String(d.getFullYear()) !== displayYear) continue;
      const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      const sortKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!map[key]) map[key] = { total: 0, sortKey };
      map[key].total += p.amount || 0;
    }
    return Object.entries(map)
      .map(([label, { total, sortKey }]) => ({ label, value: total, sortKey }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ label, value }) => ({ label, value }));
  }, [verifiedPayments, displayYear]);

  const dailyRevenue = useMemo(() => {
    const map: Record<string, { total: number; count: number; sortKey: string }> = {};
    for (const p of paymentsInPeriod) {
      const d = new Date(p.verified_at ?? p.created_at);
      const dateLabel = d.toLocaleDateString("en-PH");
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      if (!map[dateLabel]) map[dateLabel] = { total: 0, count: 0, sortKey };
      map[dateLabel].total += p.amount || 0;
      map[dateLabel].count++;
    }
    return Object.entries(map)
      .map(([date, { total, count, sortKey }]) => ({ date, total, count, sortKey }))
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [paymentsInPeriod]);

  const filteredPayments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return verifiedPayments.filter((p) => {
      if (selectedDoc && p.requests?.documents?.name !== selectedDoc) return false;
      if (!q) return true;
      const fields: Record<string, string> = {
        all: [
          p.reference_number ?? "",
          p.requests?.profiles?.full_name ?? "",
          p.requests?.documents?.name ?? "",
          p.payment_method === "walk_in" ? "Walk-in" : "GCash",
          p.requests?.tracking_code ?? "",
        ].join(" "),
        receipt: p.reference_number ?? "",
        requestor: p.requests?.profiles?.full_name ?? "",
        document: p.requests?.documents?.name ?? "",
        method: p.payment_method === "walk_in" ? "Walk-in" : "GCash",
        tracking: p.requests?.tracking_code ?? "",
      };
      return fields[searchField].toLowerCase().includes(q);
    });
  }, [verifiedPayments, query, searchField, selectedDoc]);

  const methodLabel = (m: string | null) => (m === "walk_in" ? "Walk-in" : "GCash");

  const exportCsv = () => {
    const head = ["Date", "Receipt No.", "Requestor", "Document", "Method", "Tracking", "Amount"];
    const csv = [
      head,
      ...filteredPayments.map((p) => [
        new Date(p.verified_at ?? p.created_at).toLocaleDateString("en-PH"),
        p.reference_number ?? "",
        p.requests?.profiles?.full_name ?? "",
        p.requests?.documents?.name ?? "",
        methodLabel(p.payment_method),
        p.requests?.tracking_code ?? "",
        p.amount || 0,
      ]),
    ]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payments-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
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
    );
  }

  const maxStatus = Math.max(...statusData.map((s) => s.count));
  const donutTotal = documentData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#0d2240]">Analytics</h1>
          <p className="mt-1 text-sm text-[#4a5b75]">Request volume, demand and revenue at a glance.</p>
        </div>
        <span className="rounded-full border border-[#e2e8f1] bg-white px-3 py-1.5 text-xs text-[#4a5b75]">
          All time
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="rounded-[14px] bg-gradient-to-br from-[#0d2240] to-[#0d47a1] p-5 text-white">
          <p className="text-xs text-[#b9cdee]">Total revenue</p>
          <p className="mt-1.5 text-[34px] font-bold leading-none tabular-nums">{peso(totalRevenue)}</p>
          <p className="mt-2 text-xs text-[#b9cdee]">From paid requests</p>
        </div>
        <div className="rounded-[14px] border border-[#e2e8f1] bg-white p-5">
          <p className="text-xs text-[#4a5b75]">Total requests</p>
          <p className="mt-1.5 text-[34px] font-bold leading-none text-[#0d2240] tabular-nums">
            {rows.length}
          </p>
          <p className="mt-2 text-xs text-[#8494ab]">{pendingCount} waiting for action</p>
        </div>
        <div className="rounded-[14px] border border-[#e2e8f1] bg-white p-5">
          <p className="text-xs text-[#4a5b75]">Document types</p>
          <p className="mt-1.5 text-[34px] font-bold leading-none text-[#0d2240] tabular-nums">
            {documentData.length}
          </p>
          <p className="mt-2 text-xs text-[#8494ab]">In demand</p>
        </div>
        <div className="rounded-[14px] border border-[#e2e8f1] bg-white p-5">
          <p className="text-xs text-[#4a5b75]">Total copies</p>
          <p className="mt-1.5 text-[34px] font-bold leading-none text-[#0d2240] tabular-nums">
            {totalCopies}
          </p>
          <p className="mt-2 text-xs text-[#8494ab]">
            Avg. {(totalCopies / Math.max(1, rows.length)).toFixed(1)} per request
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 rounded-[14px] border border-[#e2e8f1] bg-white p-3.5">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8494ab]" />
          <input
            className="input h-10 w-full pl-9"
            placeholder="Search receipts, requestors, tracking codes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="input h-10 w-auto"
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as SearchField)}
        >
          {SEARCH_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        {selectedDoc && (
          <button
            onClick={() => setSelectedDoc(null)}
            className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[#c5d8f5] bg-[#e8f0fc] px-3 text-sm font-medium text-[#0d47a1] hover:bg-[#d9e7fb]"
          >
            {selectedDoc} <span aria-hidden>✕</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-[14px] border border-[#e2e8f1] bg-white p-5">
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold text-[#0d2240]">Requests by status</h2>
            <p className="text-xs text-[#8494ab]">Where requests are in the workflow</p>
          </div>
          <div className="space-y-3">
            {statusData.length === 0 ? (
              <p className="text-sm text-[#8494ab]">No matching results.</p>
            ) : (
              statusData.map((s) => (
                <div key={s.status} className="grid grid-cols-[96px_1fr_28px] items-center gap-3 text-[13px] sm:grid-cols-[110px_1fr_34px]">
                  <span className="text-[#0d2240]">{titleCaseStatus(s.status)}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-[#eef2f8]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(s.count / Math.max(1, maxStatus)) * 100}%`,
                        background: STATUS_COLORS[s.status] ?? "#0d47a1",
                      }}
                    />
                  </div>
                  <span className="text-right font-semibold tabular-nums">{s.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[14px] border border-[#e2e8f1] bg-white p-5">
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold text-[#0d2240]">Requests by month</h2>
            <p className="text-xs text-[#8494ab]">Volume over time</p>
          </div>
          {monthData.length === 0 ? (
            <p className="text-sm text-[#8494ab]">No requests yet.</p>
          ) : (
            <ColumnChart items={monthData} />
          )}
        </div>
      </div>

      <div className="rounded-[14px] border border-[#e2e8f1] bg-white p-5">
        <div className="mb-4">
          <h2 className="text-[15px] font-semibold text-[#0d2240]">Requests by document type</h2>
          <p className="text-xs text-[#8494ab]">
            Select a slice or a row to filter the payments report below.
          </p>
        </div>
        {documentData.length === 0 ? (
          <p className="text-sm text-[#8494ab]">No requests yet.</p>
        ) : (
          <div className="grid items-center gap-7 lg:grid-cols-[260px_1fr]">
            <div className="relative mx-auto h-60 w-60 lg:mx-0">
              <svg viewBox="0 0 260 260" className="h-full w-full -rotate-90">
                {(() => {
                  let a = 0;
                  const gap = 0.02;
                  return documentData.map((d) => {
                    const span = ((d.count / donutTotal) * Math.PI * 2);
                    const path = arc(130, 130, 78, 120, a + gap / 2, a + span - gap / 2);
                    a += span;
                    return (
                      <path
                        key={d.name}
                        d={path}
                        fill={d.color}
                        onClick={() => setSelectedDoc(selectedDoc === d.name ? null : d.name)}
                        className={`cursor-pointer transition-opacity ${
                          selectedDoc && selectedDoc !== d.name ? "opacity-25" : ""
                        }`}
                      >
                        <title>
                          {d.name}: {d.count}
                        </title>
                      </path>
                    );
                  });
                })()}
              </svg>
              <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                <p className="text-[30px] font-bold leading-none text-[#0d2240] tabular-nums">
                  {selectedDoc ? documentData.find((d) => d.name === selectedDoc)?.count : donutTotal}
                </p>
                <p className="text-xs text-[#8494ab]">{selectedDoc ? "selected" : "requests"}</p>
              </div>
            </div>
            <ul className="space-y-1">
              {documentData.map((d) => {
                const sel = selectedDoc === d.name;
                return (
                  <li key={d.name}>
                    <button
                      onClick={() => setSelectedDoc(sel ? null : d.name)}
                      className={`grid w-full grid-cols-[12px_1fr_auto_44px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left ${
                        sel ? "bg-[#e8f0fc]" : "hover:bg-[#f4f6fa]"
                      }`}
                    >
                      <span className="h-3 w-3 rounded" style={{ background: d.color }} />
                      <span className="text-sm text-[#0d2240]">{d.name}</span>
                      <span className="font-semibold tabular-nums">{d.count}</span>
                      <span className="text-right text-xs text-[#8494ab] tabular-nums">
                        {Math.round((d.count / donutTotal) * 100)}%
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-[14px] border border-[#e2e8f1] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[#0d2240]">Revenue</h2>
            <p className="text-[26px] font-semibold leading-tight text-[#00875a]">
              {peso(sectionTotal)}
            </p>
            <p className="text-xs text-[#8494ab]">
              {paymentsInPeriod.length} payment{paymentsInPeriod.length !== 1 ? "s" : ""} in this period
            </p>
          </div>
          <div className="flex gap-2.5">
            <select
              className="input h-10 w-[130px]"
              value={revGranularity}
              onChange={(e) => setRevGranularity(e.target.value as typeof revGranularity)}
            >
              <option value="month">By month</option>
              <option value="day">By day</option>
              <option value="year">By year</option>
            </select>
            <input
              className="input h-10 w-[170px]"
              type={revGranularity === "day" ? "date" : revGranularity === "year" ? "number" : "month"}
              value={revGranularity === "day" ? revDay : revGranularity === "year" ? revYear : revMonth}
              onChange={(e) => {
                const v = e.target.value;
                if (revGranularity === "day") setRevDay(v);
                else if (revGranularity === "year") setRevYear(v);
                else setRevMonth(v);
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[#0d2240]">Revenue by month ({displayYear})</h3>
            {revenueMonthData.length === 0 ? (
              <p className="text-sm text-[#8494ab]">No verified payments in {displayYear}.</p>
            ) : (
              <ColumnChart items={revenueMonthData} green format={shortNum} />
            )}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[#0d2240]">Revenue by day</h3>
            {dailyRevenue.length === 0 ? (
              <p className="text-sm text-[#8494ab]">No verified payments in this period.</p>
            ) : (
              <div className="max-h-[300px] overflow-auto rounded-[10px] border border-[#e2e8f1]">
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 z-10 bg-[#f8fafd]">
                    <tr className="border-b border-[#e2e8f1] text-left text-xs font-semibold text-[#4a5b75]">
                      <th className="px-3.5 py-2.5">Date</th>
                      <th className="px-3.5 py-2.5 text-right">Payments</th>
                      <th className="px-3.5 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRevenue.map((d) => (
                      <tr key={d.date} className="border-b border-[#eef2f8] hover:bg-[#fafcff]">
                        <td className="px-3.5 py-2.5 text-[#0d2240]">{d.date}</td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums">{d.count}</td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-[#00875a] tabular-nums">
                          {peso(d.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-[#f8fafd]">
                    <tr className="border-t border-[#e2e8f1] font-bold">
                      <td className="px-3.5 py-2.5">Total</td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums">
                        {dailyRevenue.reduce((s, d) => s + d.count, 0)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-[#00875a] tabular-nums">
                        {peso(sectionTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-[#e2e8f1] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[#0d2240]">Payments report</h2>
            <p className="text-xs text-[#8494ab]">
              {filteredPayments.length} of {verifiedPayments.length} receipts shown
            </p>
          </div>
          <button onClick={exportCsv} className="btn h-9 px-3.5 text-sm font-medium">
            Export CSV
          </button>
        </div>
        {verifiedPayments.length === 0 ? (
          <p className="text-sm text-[#8494ab]">No payments yet.</p>
        ) : (
          <div className="max-h-[420px] overflow-auto rounded-[10px] border border-[#e2e8f1]">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10 bg-[#f8fafd]">
                <tr className="border-b border-[#e2e8f1] text-left text-xs font-semibold text-[#4a5b75]">
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Receipt no.</th>
                  <th className="px-3.5 py-2.5">Requestor</th>
                  <th className="px-3.5 py-2.5">Document</th>
                  <th className="px-3.5 py-2.5">Method</th>
                  <th className="px-3.5 py-2.5">Tracking</th>
                  <th className="px-3.5 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3.5 py-9 text-center text-[#8494ab]">
                      No payments match your search. Clear the filters to see all receipts.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="border-b border-[#eef2f8] hover:bg-[#fafcff]">
                      <td className="px-3.5 py-2.5 text-[#4a5b75]">
                        {new Date(p.verified_at ?? p.created_at).toLocaleDateString("en-PH")}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-xs font-semibold text-[#0d47a1]">
                        {p.reference_number || "—"}
                      </td>
                      <td className="px-3.5 py-2.5 text-[#0d2240]">
                        {p.requests?.profiles?.full_name ?? "—"}
                      </td>
                      <td className="px-3.5 py-2.5 text-[#4a5b75]">{p.requests?.documents?.name ?? "—"}</td>
                      <td className="px-3.5 py-2.5">
                        <span className="inline-block rounded-full bg-[#e8f0fc] px-2.5 py-0.5 text-xs font-medium text-[#0d47a1]">
                          {methodLabel(p.payment_method)}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-xs text-[#4a5b75]">
                        {p.requests?.tracking_code ?? "—"}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-[#00875a] tabular-nums">
                        {peso(p.amount || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="sticky bottom-0 bg-[#f8fafd]">
                <tr className="border-t border-[#e2e8f1] font-bold text-[#0d2240]">
                  <td colSpan={6} className="px-3.5 py-2.5">
                    Total
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-[#00875a] tabular-nums">
                    {peso(filteredPayments.reduce((s, p) => s + (p.amount || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}