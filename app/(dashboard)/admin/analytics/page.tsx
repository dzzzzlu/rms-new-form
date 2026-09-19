"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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

const DOC_COLORS = ["#0b3d91", "#1565c0", "#42a5f5", "#1e88e5", "#0d5bb5", "#90caf9", "#5c8fd6", "#1976d2"];

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
  `â‚±${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const compact = (v: number) => (v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k" : String(v));

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

type TipContent = {
  heading: string;
  rows: [string, string][];
  footer?: string;
  sw?: string;
};

let bindHost: { set: (c: TipContent, x: number, y: number) => void; hide: () => void } | null = null;
let lastTip: TipContent | null = null;

const placeTip = (e: { clientX: number; clientY: number }) => {
  const x = Math.max(6, Math.min(window.innerWidth - 270 - 6, e.clientX + 14));
  const y = Math.max(6, Math.min(window.innerHeight - 90 - 6, e.clientY + 14));
  return { x, y };
};

function bind(content: TipContent) {
  return (e: { clientX: number; clientY: number }) => {
    lastTip = content;
    if (!bindHost) return;
    const p = placeTip(e);
    bindHost.set(content, p.x, p.y);
  };
}

const tipAt = (e: { clientX: number; clientY: number }, content?: TipContent) => {
  if (content) lastTip = content;
  if (!bindHost || !lastTip) return;
  const p = placeTip(e);
  bindHost.set(lastTip, p.x, p.y);
};

const tipFollow = (e: { clientX: number; clientY: number }) => {
  if (!bindHost || !lastTip) return;
  const p = placeTip(e);
  bindHost.set(lastTip, p.x, p.y);
};

const tipHide = () => {
  lastTip = null;
  if (bindHost) bindHost.hide();
};

function TooltipHost(props: { children: ReactNode }) {
  const [tip, setTip] = useState<{ c: TipContent; x: number; y: number } | null>(null);
  useEffect(() => {
    bindHost = {
      set: (c, x, y) => setTip({ c, x, y }),
      hide: () => setTip(null),
    };
    return () => {
      bindHost = null;
    };
  }, []);
  return (
    <div>
      {props.children}
      {tip ? (
        <div
          className="pointer-events-none fixed z-[100] max-w-[270px] rounded-[10px] bg-[#0d2240] px-3 py-2.5 text-[12.5px] leading-relaxed text-white shadow-[0_14px_34px_rgba(13,34,64,0.35)]"
          style={{ left: tip.x, top: tip.y }}
        >
          <b className="mb-1 block text-[13px] font-semibold">
            {tip.c.sw ? (
              <i className="mr-1.5 inline-block h-2 w-2 rounded-[3px] align-[-1px]" style={{ background: tip.c.sw }} />
            ) : null}
            {tip.c.heading}
          </b>
          {tip.c.rows.map(([k, v], i) => (
            <div key={i} className="flex justify-between gap-4 text-[#bcd0ee]">
              <span>{k}</span>
              <span className="whitespace-nowrap font-semibold text-white">{v}</span>
            </div>
          ))}
          {tip.c.footer ? <div className="mt-1 text-[11px] text-[#8494ab]">{tip.c.footer}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

type BarItem = { label: string; n: number; color: string };

function StatusRows({ items }: { items: BarItem[] }) {
  const max = Math.max(...items.map((i) => i.n), 1);
  const tot = items.reduce((s, i) => s + i.n, 0);
  return (
    <div className="grid gap-3">
      {items.map((s) => (
        <div
          key={s.label}
          className="grid cursor-default grid-cols-[110px_1fr_34px] items-center gap-3 text-[13px] transition-transform duration-150 hover:scale-[1.02]"
          onMouseEnter={bind({
            heading: s.label,
            rows: [
              ["Requests", String(s.n)],
              ["Share of all", Math.round((s.n / tot) * 100) + "%"],
            ],
            sw: s.color,
          })}
          onMouseMove={tipFollow}
          onMouseLeave={tipHide}
        >
          <span className="text-[#0d2240]">{s.label}</span>
          <div className="h-3 overflow-hidden rounded-full bg-[#eef2f8]">
            <div className="a-grow h-full rounded-full" style={{ width: `${(s.n / max) * 100}%`, background: s.color }} />
          </div>
          <span className="text-right font-semibold tabular-nums">{s.n}</span>
        </div>
      ))}
    </div>
  );
}

type ColumnItem = { label: string; value: number };

function ColumnChart({
  items,
  green = false,
  fmt = (v: number) => compact(v),
  tip,
}: {
  items: ColumnItem[];
  green?: boolean;
  fmt?: (v: number) => string;
  tip?: (item: ColumnItem, idx: number, arr: ColumnItem[]) => TipContent | undefined;
}) {
  const max = niceMax(Math.max(...items.map((i) => i.value), 1));
  const ticks = [0, 1, 2, 3, 4].map((i) => Math.round((max / 4) * i));
  return (
    <div>
      <div className="relative flex h-48 items-end gap-7 border-b border-[#8494ab] bg-[repeating-linear-gradient(to_top,#e2e8f1_0_1px,transparent_1px_25%)] pl-10 pr-1 pt-2">
        <div className="absolute inset-y-0 left-0 flex w-10 flex-col-reverse justify-between pl-1 text-right text-[11px] text-[#8494ab] tabular-nums">
          {ticks.map((t, i) => (
            <span
              key={`${t}-${i}`}
              className={i === ticks.length - 1 ? "-translate-y-1/2" : "translate-y-1/2"}
              style={{ lineHeight: "14px" }}
            >
              {fmt(t)}
            </span>
          ))}
        </div>
        {items.map((it, idx) => {
          const t = tip && tip(it, idx, items);
          return (
            <div
              key={it.label}
              className="relative flex h-full max-w-[90px] flex-1 cursor-default flex-col items-center justify-end transition-transform duration-150 hover:scale-110"
              style={{ transformOrigin: "bottom center" }}
              onMouseEnter={(e) => {
                if (t) tipAt(e, t);
              }}
              onMouseMove={tipFollow}
              onMouseLeave={tipHide}
            >
              <span className="mb-1.5 text-xs font-semibold text-[#0d2240] tabular-nums">{fmt(it.value)}</span>
              <div
                className={`a-rise min-h-[3px] w-full rounded-t-lg ${green ? "bg-[#00875a]" : "bg-[#0d47a1]"}`}
                style={{ height: `${Math.max(3, (it.value / max) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-7 pl-10 pr-1">
        {items.map((it) => (
          <span key={it.label} className="max-w-[90px] flex-1 truncate text-center text-xs text-[#4a5b75]">
            {it.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function donutArc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(r1, a0);
  const [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1);
  const [x3, y3] = p(r0, a0);
  return `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`;
}export default function AnalyticsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [donutHot, setDonutHot] = useState<string | null>(null);
  const [revGranularity, setRevGranularity] = useState<"month" | "day" | "year">("month");
  const [revYear, setRevYear] = useState(new Date().getFullYear());
  const [revMonth, setRevMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );
  const [revDay, setRevDay] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(
      new Date().getDate()
    ).padStart(2, "0")}`
  );

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        const [r, p] = await Promise.all([
          supabase
            .from("requests")
            .select("status, created_at, copies, documents(name, fee), profiles(full_name, course)")
          ,
          supabase
            .from("payments")
            .select(
              "id, amount, status, reference_number, created_at, verified_at, payment_method, requests(tracking_code, documents(name), profiles(full_name))"
            )
          ,
        ]);
        setRows((r.data ?? []) as Row[]);
        setPayments((p.data ?? []) as PaymentRow[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const verifiedPayments = useMemo(() => payments.filter((p) => p.status === "Verified"), [payments]);

  const statusData = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.status, (m.get(r.status) ?? 0) + 1);
    return [...m.entries()].map(([status, count]) => ({ status, count }));
  }, [rows]);

  const pendingCount = useMemo(
    () => rows.filter((r) => ["pending", "payment verification"].includes(r.status)).length,
    [rows]
  );
  const completedCount = useMemo(() => rows.filter((r) => r.status === "completed").length, [rows]);
  const reviewCount = useMemo(() => rows.filter((r) => r.status === "payment verification").length, [rows]);
  const inProgressCount = useMemo(
    () => rows.filter((r) => ["processing", "ready for pickup"].includes(r.status)).length,
    [rows]
  );

  const totalCopies = useMemo(() => rows.reduce((s, r) => s + (r.copies || 0), 0), [rows]);

  const documentData = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const n = r.documents?.name;
      if (!n) continue;
      m.set(n, (m.get(n) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([name, count], i) => ({ name, count, color: DOC_COLORS[i % DOC_COLORS.length] }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const monthData = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = r.created_at.slice(0, 7);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    const keys = [...m.keys()].sort();
    return keys.map((k) => {
      const d = new Date(k + "-28T12:00:00");
      return {
        label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        value: m.get(k) ?? 0,
      };
    });
  }, [rows]);

  const { totalRevenue, paymentsInPeriod } = useMemo(() => {
    const total = verifiedPayments.reduce((s, p) => s + (p.amount || 0), 0);
    return { totalRevenue: total, paymentsInPeriod: verifiedPayments };
  }, [verifiedPayments]);

  const sectionTotal = useMemo(
    () => paymentsInPeriod.reduce((s, p) => s + (p.amount || 0), 0),
    [paymentsInPeriod]
  );

  const displayYear = useMemo(() => {
    if (verifiedPayments.length === 0) return revYear;
    const minYear = Math.min(...verifiedPayments.map((p) => Number((p.verified_at ?? p.created_at).slice(0, 4))));
    if (revYear < minYear) return minYear;
    const maxYear = Math.max(...verifiedPayments.map((p) => Number((p.verified_at ?? p.created_at).slice(0, 4))));
    if (revYear > maxYear) return maxYear;
    return revYear;
  }, [verifiedPayments, revYear]);

  const revenueMonthData = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of paymentsInPeriod) {
      const d = (p.verified_at ?? p.created_at).slice(0, 7);
      if (Number(d.slice(0, 4)) !== displayYear) continue;
      m.set(d, (m.get(d) ?? 0) + (p.amount || 0));
    }
    const keys = [...m.keys()].sort();
    return keys.map((k) => ({
      label: new Date(k + "-28T12:00:00").toLocaleDateString("en-US", { month: "short" }),
      value: m.get(k) ?? 0,
    }));
  }, [paymentsInPeriod, displayYear]);

  const dailyRevenue = useMemo(() => {
    const m = new Map<string, { total: number; count: number }>();
    for (const p of paymentsInPeriod) {
      const d = (p.verified_at ?? p.created_at).slice(0, 10);
      if (!d.startsWith(String(displayYear))) continue;
      const cur = m.get(d) ?? { total: 0, count: 0 };
      cur.total += p.amount || 0;
      cur.count += 1;
      m.set(d, cur);
    }
    return [...m.entries()]
      .map(([date, v]) => ({
        date,
        total: v.total,
        count: v.count,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [paymentsInPeriod, displayYear]);

  const filteredPayments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return paymentsInPeriod
      .filter((p) => {
        if (selectedDoc) {
          const docName = p.requests?.documents?.name;
          if (docName !== selectedDoc) return false;
        }
        if (!q) return true;
        const target = (() => {
          switch (searchField) {
            case "receipt":
              return p.reference_number ?? "";
            case "requestor":
              return p.requests?.profiles?.full_name ?? "";
            case "document":
              return p.requests?.documents?.name ?? "";
            case "method":
              return p.payment_method ?? "";
            case "tracking":
              return p.requests?.tracking_code ?? "";
            default:
              return [
                p.reference_number,
                p.requests?.profiles?.full_name,
                p.requests?.documents?.name,
                p.payment_method,
                p.requests?.tracking_code,
              ]
                .filter(Boolean)
                .join(" ");
          }
        })();
        return target.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const ta = a.verified_at ?? a.created_at;
        const tb = b.verified_at ?? b.created_at;
        return ta < tb ? 1 : -1;
      });
  }, [paymentsInPeriod, query, searchField, selectedDoc]);

  const sectionTotal2 = useMemo(
    () => filteredPayments.reduce((s, p) => s + (p.amount || 0), 0),
    [filteredPayments]
  );

  if (loading) {
    return (
      <div className="grid gap-5">
        <div className="skeleton h-6 w-40 rounded-lg" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="skeleton h-72 rounded-xl" />
          <div className="skeleton h-72 rounded-xl" />
        </div>
        <div className="skeleton h-96 rounded-xl" />
      </div>
    );
  }

  const statusBars = statusData.map((s) => ({
    label: titleCaseStatus(s.status),
    n: s.count,
    color: STATUS_COLORS[s.status] ?? "#0d47a1",
  }));
  const statusTot = statusData.reduce((s, x) => s + x.count, 0) || 1;
  const donutTotal = documentData.reduce((s, d) => s + d.count, 0) || 1;
  const topDoc = documentData[0];
  const hotDoc = donutHot ? documentData.find((d) => d.name === donutHot) : undefined;
  const centerN = hotDoc
    ? hotDoc.count
    : selectedDoc
      ? (documentData.find((d) => d.name === selectedDoc)?.count ?? donutTotal)
      : donutTotal;
  const centerTxt = hotDoc
    ? `${Math.round((hotDoc.count / donutTotal) * 100)}% of requests`
    : selectedDoc
      ? "selected"
      : "requests";
  const dayCount = dailyRevenue.reduce((s, d) => s + d.count, 0);
  const dayTotal = dailyRevenue.reduce((s, d) => s + d.total, 0);
  const latestRev = revenueMonthData[revenueMonthData.length - 1];
  const payN = paymentsInPeriod.length;
  const payAvg = sectionTotal / Math.max(1, payN);
  const copiesAvg = totalCopies / Math.max(1, rows.length);

  return (
    <TooltipHost>
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[#0d2240]">Analytics</h1>
          <p className="mt-1 text-[13px] text-[#4a5b75]">Request volume, demand and revenue at a glance.</p>
        </div>
        <span className="rounded-[7px] bg-[#e8f0fd] px-2.5 py-1 text-xs font-medium text-[#0d47a1]">All time</span>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:[grid-template-columns:1.5fr_1fr_1fr_1fr]">
        <div
          className="cursor-default rounded-2xl bg-gradient-to-br from-[#0d2240] to-[#0d47a1] p-[22px] text-white shadow-[0_14px_34px_rgba(13,34,64,0.24)] transition-transform duration-150 hover:-translate-y-[3px] hover:scale-[1.03] hover:shadow-[0_18px_38px_rgba(13,34,64,0.34)]"
          onMouseEnter={bind({
            heading: "Revenue",
            rows: [
              ["Latest month (" + (latestRev?.label ?? String(displayYear)) + ")", peso(latestRev?.value ?? 0)],
              ["Payments in period", String(payN)],
              ["Average per payment", peso(payAvg)],
            ],
          })}
          onMouseMove={tipFollow}
          onMouseLeave={tipHide}
        >
          <p className="text-[12.5px] font-medium text-[#bcd0ee]">Total revenue</p>
          <p className="mt-2 text-[32px] font-bold tabular-nums">{peso(sectionTotal)}</p>
          <p className="mt-1.5 text-xs font-medium text-[#e6eef8]">From paid requests</p>
        </div>
        <div
          className="cursor-default rounded-2xl bg-white p-[22px] shadow-[0_2px_12px_rgba(13,34,64,0.08)] transition-transform duration-150 hover:-translate-y-[3px] hover:scale-[1.03] hover:shadow-[0_14px_30px_rgba(13,34,64,0.16)]"
          onMouseEnter={bind({
            heading: "Requests by status",
            rows: statusBars.map((s) => [s.label, String(s.n)]),
            sw: "#0d47a1",
          })}
          onMouseMove={tipFollow}
          onMouseLeave={tipHide}
        >
          <p className="text-[12.5px] font-medium text-[#4a5b75]">Total requests</p>
          <p className="mt-2 text-[32px] font-bold text-[#0d2240] tabular-nums">{rows.length.toLocaleString()}</p>
          <p className="mt-1.5 text-xs font-medium text-[#1e88e5]">{pendingCount} waiting for action</p>
        </div>
        <div
          className="cursor-default rounded-2xl bg-white p-[22px] shadow-[0_2px_12px_rgba(13,34,64,0.08)] transition-transform duration-150 hover:-translate-y-[3px] hover:scale-[1.03] hover:shadow-[0_14px_30px_rgba(13,34,64,0.16)]"
          onMouseEnter={bind({
            heading: "Most requested",
            rows: topDoc
              ? [
                  ["Name", topDoc.name],
                  ["Requests", String(topDoc.count)],
                  ["Share of all", Math.round((topDoc.count / donutTotal) * 100) + "%"],
                ]
              : [["Info", "No requests yet"]],
            sw: topDoc?.color ?? "#0d47a1",
          })}
          onMouseMove={tipFollow}
          onMouseLeave={tipHide}
        >
          <p className="text-[12.5px] font-medium text-[#4a5b75]">Document types</p>
          <p className="mt-2 text-[32px] font-bold text-[#0d2240] tabular-nums">{documentData.length}</p>
          <p className="mt-1.5 text-xs font-medium text-[#10b981]">In demand</p>
        </div>
        <div
          className="cursor-default rounded-2xl bg-white p-[22px] shadow-[0_2px_12px_rgba(13,34,64,0.08)] transition-transform duration-150 hover:-translate-y-[3px] hover:scale-[1.03] hover:shadow-[0_14px_30px_rgba(13,34,64,0.16)]"
          onMouseEnter={bind({
            heading: "Copies issued",
            rows: [
              ["Total copies", String(totalCopies)],
              ["Total requests", String(rows.length)],
              ["Average per request", copiesAvg.toFixed(1)],
            ],
            sw: "#10b981",
          })}
          onMouseMove={tipFollow}
          onMouseLeave={tipHide}
        >
          <p className="text-[12.5px] font-medium text-[#4a5b75]">Total copies</p>
          <p className="mt-2 text-[32px] font-bold text-[#0d2240] tabular-nums">{totalCopies.toLocaleString()}</p>
          <p className="mt-1.5 text-xs font-medium text-[#8b5cf6]">
            Ã˜ {copiesAvg.toFixed(1)} per request
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3.5 shadow-[0_2px_12px_rgba(13,34,64,0.08)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8494ab]" />
            <input
              className="input h-9 w-56 rounded-xl py-0 pl-9 pr-3 text-[13px]"
              placeholder="Search paymentsâ€¦"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="input h-9 w-fit rounded-xl px-3 py-0 text-[13px]"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as SearchField)}
          >
            {SEARCH_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          {selectedDoc ? (
            <button
              onClick={() => setSelectedDoc(null)}
              className="flex h-8 items-center gap-1.5 rounded-full bg-[#e8f0fd] px-3 text-xs font-medium text-[#0d47a1] transition-colors hover:bg-[#d7e4fb]"
            >
              {selectedDoc}
              <span className="text-[#5c8fd6]">âœ•</span>
            </button>
          ) : null}
        </div>
        <p className="text-xs font-medium text-[#8494ab]">
          {filteredPayments.length.toLocaleString()} payment{filteredPayments.length === 1 ? "" : "s"} shown
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card rounded-2xl p-6">
          <h2 className="text-[15px] font-semibold text-[#0d2240]">Requests by status</h2>
          <div className="mt-5">
            {statusBars.length ? <StatusRows items={statusBars} /> : <p className="text-sm text-[#8494ab]">No requests yet.</p>}
          </div>
        </div>
        <div className="card rounded-2xl p-6">
          <h2 className="text-[15px] font-semibold text-[#0d2240]">Requests by month</h2>
          <div className="mt-5">
            {monthData.length ? (
              <ColumnChart
                items={monthData}
                tip={(it, idx, arr) => {
                  const prev = idx > 0 ? arr[idx - 1] : undefined;
                  const rows: [string, string][] = [
                    ["Requests", String(it.value)],
                    ["Share of all", Math.round((it.value / statusTot) * 100) + "%"],
                  ];
                  if (prev) {
                    rows.push(["vs " + prev.label, `${it.value >= prev.value ? "+" : ""}${it.value - prev.value}`]);
                  }
                  return {
                    heading: it.label,
                    rows,
                    sw: "#0d47a1",
                  };
                }}
              />
            ) : (
              <p className="text-sm text-[#8494ab]">No requests yet.</p>
            )}
          </div>
        </div>
      </div><div className="card mt-5 rounded-2xl p-6">
        <h2 className="text-[15px] font-semibold text-[#0d2240]">Requests by document type</h2>
        <div className="mt-5">
          {documentData.length ? (
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_280px]">
              <div className="flex justify-center">
                <svg viewBox="0 0 260 260" className="donut w-[250px] max-w-full overflow-visible">
                  <g transform="rotate(-90 130 130)">
                    {documentData.map((d) => {
                      const a0 =
                        (documentData
                          .slice(0, documentData.indexOf(d))
                          .reduce((s, x) => s + x.count, 0) /
                          donutTotal) *
                          2 *
                          Math.PI +
                        0.02;
                      const a1 = a0 + Math.max(0.05, (d.count / donutTotal) * 2 * Math.PI - 0.04);
                      const dim =
                        donutHot !== null
                          ? donutHot === d.name
                            ? 0
                            : 0.45
                          : selectedDoc
                            ? selectedDoc === d.name
                              ? 0
                              : 0.25
                            : null;
                      return (
                        <path
                          key={d.name}
                          d={donutArc(130, 130, 78, 120, a0, a1)}
                          fill={d.color}
                          className="cursor-pointer transition-all duration-200"
                          style={{ transformOrigin: "130px 130px", opacity: dim === null ? 1 : dim, transition:
dim === null ? "all .2s" : undefined }}
                          onMouseEnter={(e) => {
                            setDonutHot(d.name);
                            tipAt(e, {
                              heading: d.name,
                              rows: [
                                ["Requests", String(d.count)],
                                ["Share", Math.round((d.count / donutTotal) * 100) + "%"],
                              ],
                              sw: d.color,
                              footer: "Click to filter payments",
                            });
                          }}
                          onMouseMove={tipFollow}
                          onMouseLeave={() => {
                            setDonutHot(null);
                            tipHide();
                          }}
                          onClick={() => setSelectedDoc((prev) => (prev === d.name ? null : d.name))}
                        />
                      );
                    })}
                  </g>
                  <text x="130" y="124" textAnchor="middle" className="fill-[#0d2240] text-[38px] font-bold tabular-nums">
                    {centerN}
                  </text>
                  <text x="130" y="146" textAnchor="middle" className="fill-[#8494ab] text-[13px]">
                    {centerTxt}
                  </text>
                </svg>
              </div>
              <div className="flex flex-col gap-2">
                {documentData.map((d) => {
                  const hot = donutHot === d.name;
                  const sel = selectedDoc === d.name;
                  return (
                    <button
                      key={d.name}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all duration-150 hover:bg-[#f4f7fb]"
                      style={
                        hot || sel
                          ? { background: "#eef3fc", boxShadow: "inset 0 0 0 1px #d7e4fb" }
                          : undefined
                      }
                      onMouseEnter={(e) => {
                        setDonutHot(d.name);
                        tipAt(e, {
                          heading: d.name,
                          rows: [
                            ["Requests", String(d.count)],
                            ["Share", Math.round((d.count / donutTotal) * 100) + "%"],
                          ],
                          sw: d.color,
                        });
                      }}
                      onMouseMove={tipFollow}
                      onMouseLeave={() => {
                        setDonutHot(null);
                        tipHide();
                      }}
                      onClick={() => setSelectedDoc((prev) => (prev === d.name ? null : d.name))}
                    >
                      <i className="h-2.5 w-2.5 shrink-0 rounded-[4px]" style={{ background: d.color }} />
                      <span className="flex-1 truncate text-[13px] text-[#0d2240]">{d.name}</span>
                      <span className="text-xs font-medium text-[#8494ab] tabular-nums">{d.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#8494ab]">No requests yet.</p>
          )}
        </div>
      </div>

      <div className="card mt-5 rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[#0d2240]">Revenue</h2>
            <p className="mt-0.5 text-xs font-medium text-[#8494ab]">
              {paymentsInPeriod.length.toLocaleString()} payments in this period
            </p>
          </div>
          <div className="controls flex items-center gap-2">
            <select
              className="input h-8 w-fit rounded-lg px-3 py-0 text-[12px]"
              value={revGranularity}
              onChange={(e) => setRevGranularity(e.target.value as "month" | "day" | "year")}
            >
              {["month", "day", "year"].map((g) => (
                <option key={g} value={g}>
                  By {g}
                </option>
              ))}
            </select>
            {revGranularity === "month" ? (
              <input
                className="input h-8 w-fit rounded-lg px-2.5 text-[12px]"
                type="month"
                value={revMonth}
                onChange={(e) => setRevMonth(e.target.value)}
              />
            ) : revGranularity === "day" ? (
              <input
                className="input h-8 w-fit rounded-lg px-2.5 text-[12px]"
                type="date"
                value={revDay}
                onChange={(e) => setRevDay(e.target.value)}
              />
            ) : (
              <input
                className="input h-8 w-fit rounded-lg px-2.5 text-[12px]"
                type="number"
                value={revYear}
                onChange={(e) => setRevYear(Number(e.target.value))}
              />
            )}
          </div>
        </div>
        <p className="mt-4 text-[13px] font-bold text-[#00875a] tabular-nums">{peso(sectionTotal)}</p>
        <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h3 className="text-[13px] font-semibold text-[#0d2240]">Revenue by month Â· {displayYear}</h3>
            <div className="mt-4">
              {revenueMonthData.length ? (
                <ColumnChart
                  green
                  items={revenueMonthData}
                  fmt={compact}
                  tip={(it) => ({
                    heading: it.label,
                    rows: [
                      ["Revenue", peso(it.value)],
                      ["Share of period", Math.round((it.value / Math.max(1, sectionTotal)) * 100) + "%"],
                    ],
                    sw: "#00875a",
                  })}
                />
              ) : (
                <p className="text-sm text-[#8494ab]">No verified payments in {displayYear}.</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-[#0d2240]">Revenue by day</h3>
            <div className="mt-4 max-h-[260px] overflow-auto rounded-xl border border-[#eef2f8]">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="table-row sticky top-0 left-0 bg-[#f4f7fb] px-3 py-2 text-left font-semibold text-[#0d2240]">Date</th>
                    <th className="table-row sticky top-0 bg-[#f4f7fb] px-3 py-2 text-right font-semibold text-[#0d2240]">Payments</th>
                    <th className="table-row sticky top-0 bg-[#f4f7fb] px-3 py-2 text-right font-semibold text-[#0d2240]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRevenue.map((d) => {
                    const dPct = Math.round((d.total / Math.max(1, dayTotal)) * 100) + "%";
                    return (
                      <tr
                        key={d.date}
                        className="border-t border-[#eef2f8] transition-colors hover:bg-[#fafcff]"
                        onMouseEnter={(e) =>
                          tipAt(e, {
                            heading: d.date,
                            rows: [
                              ["Payments", String(d.count)],
                              ["Total", peso(d.total)],
                              ["Avg per payment", peso(d.total / Math.max(1, d.count))],
                              ["Share of period", dPct],
                            ],
                            sw: "#00875a",
                          })
                        }
                        onMouseMove={tipFollow}
                        onMouseLeave={tipHide}
                      >
                        <td className="px-3 py-2 text-[#0d2240] tabular-nums">{d.date}</td>
                        <td className="px-3 py-2 text-right text-[#4a5b75] tabular-nums">{d.count}</td>
                        <td className="px-3 py-2 text-right font-semibold text-[#00875a] tabular-nums">{peso(d.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {dailyRevenue.length ? (
                  <tfoot>
                    <tr className="border-t border-[#d7e4fb] bg-[#f4f7fb]">
                      <td className="px-3 py-2 text-xs font-semibold text-[#0d2240]">Totals</td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-[#0d2240] tabular-nums">{dayCount}</td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-[#00875a] tabular-nums">{peso(dayTotal)}</td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-5 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[#0d2240]">Payments report</h2>
            <p className="mt-0.5 text-xs font-medium text-[#8494ab]">{filteredPayments.length.toLocaleString()} verified payments</p>
          </div>
          <button
            onClick={() => {
              const head = ["Date", "Receipt no.", "Requestor", "Document", "Method", "Tracking", "Amount"];
              const rows2 = filteredPayments.map((p) => [
                (p.verified_at ?? p.created_at).slice(0, 10),
                p.reference_number ?? "",
                p.requests?.profiles?.full_name ?? "",
                p.requests?.documents?.name ?? "",
                p.payment_method ?? "",
                p.requests?.tracking_code ?? "",
                (p.amount || 0).toFixed(2),
              ]);
              const esc = (v: string) => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
              const csv = [head, ...rows2].map((r) => r.map(esc).join(",")).join("\n");
              const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
              const a = document.createElement("a");
              a.href = url;
              a.download = "payments-report.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn-outline h-9 rounded-xl px-4 text-xs"
          >
            Export CSV
          </button>
        </div>
        {selectedDoc ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-[#4a5b75]">
            <button onClick={() => setSelectedDoc(null)} className="flex h-6 items-center gap-1 rounded-full bg-[#e8f0fd] px-2.5 text-xs font-medium text-[#0d47a1] transition-colors hover:bg-[#d7e4fb]">
              {selectedDoc} <span className="text-[#5c8fd6]">âœ•</span>
            </button>
          </div>
        ) : null}
        <div className="mt-4 max-h-[400px] overflow-auto rounded-xl border border-[#eef2f8]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="table-row sticky top-0 left-0 bg-[#f4f7fb] px-3 py-2 text-left font-semibold text-[#0d2240]">Date</th>
                <th className="table-row sticky top-0 bg-[#f4f7fb] px-3 py-2 text-left font-semibold text-[#0d2240]">Receipt no.</th>
                <th className="table-row sticky top-0 bg-[#f4f7fb] px-3 py-2 text-left font-semibold text-[#0d2240]">Requestor</th>
                <th className="table-row sticky top-0 bg-[#f4f7fb] px-3 py-2 text-left font-semibold text-[#0d2240]">Document</th>
                <th className="table-row sticky top-0 bg-[#f4f7fb] px-3 py-2 text-left font-semibold text-[#0d2240]">Method</th>
                <th className="table-row sticky top-0 bg-[#f4f7fb] px-3 py-2 text-left font-semibold text-[#0d2240]">Tracking</th>
                <th className="table-row sticky top-0 bg-[#f4f7fb] px-3 py-2 text-right font-semibold text-[#0d2240]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length ? (
                filteredPayments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-[#eef2f8] transition-colors hover:bg-[#fafcff]"
                    onMouseEnter={(e) =>
                      tipAt(e, {
                        heading: p.reference_number || "Payment",
                        rows: [
                          ["Requestor", p.requests?.profiles?.full_name ?? "â€”"],
                          ["Document", p.requests?.documents?.name ?? "â€”"],
                          ["Amount", peso(p.amount || 0)],
                          ["Share of shown", Math.round(((p.amount || 0) / Math.max(1, sectionTotal2)) * 100) + "%"],
                        ],
                        sw: "#0d47a1",
                      })
                    }
                    onMouseMove={tipFollow}
                    onMouseLeave={tipHide}
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-[#4a5b75] tabular-nums">
                      {(p.verified_at ?? p.created_at).slice(0, 10)}
                    </td>
                    <td className="px-3 py-2 font-medium text-[#0d2240]">{p.reference_number ?? "â€”"}</td>
                    <td className="px-3 py-2 text-[#0d2240]">{p.requests?.profiles?.full_name ?? "â€”"}</td>
                    <td className="px-3 py-2 text-[#4a5b75]">{p.requests?.documents?.name ?? "â€”"}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-md bg-[#eef3fc] px-1.5 py-0.5 text-[11px] font-medium text-[#5c8fd6]">
                        {p.payment_method ?? "â€”"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[12px] text-[#8494ab]">
                      {p.requests?.tracking_code ?? "â€”"}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-[#0d2240] tabular-nums">{peso(p.amount || 0)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-[#8494ab]">
                    {query || selectedDoc ? "No payments match your filters." : "No verified payments yet."}
                  </td>
                </tr>
              )}
            </tbody>
            {filteredPayments.length ? (
              <tfoot>
                <tr className="border-t border-[#d7e4fb] bg-[#f4f7fb]">
                  <td colSpan={6} className="px-3 py-2 text-xs font-semibold text-[#0d2240]">
                    Totals Â· {filteredPayments.length.toLocaleString()} payments
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-semibold text-[#0d2240] tabular-nums">{peso(sectionTotal2)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    </div>
    </TooltipHost>
  );
}