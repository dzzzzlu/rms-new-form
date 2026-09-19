"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Inbox,
  KeyRound,
  MousePointer2,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";

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

const DOC_COLORS = ["#0A3B5C", "#056651", "#77BDC7", "#F7D488", "#0b3d91", "#42a5f5", "#1976d2", "#90caf9"];

const SEARCH_FIELDS = [
  { value: "all", label: "All fields" },
  { value: "receipt", label: "Receipt no." },
  { value: "requestor", label: "Requestor" },
  { value: "document", label: "Document" },
  { value: "method", label: "Method" },
  { value: "tracking", label: "Tracking" },
] as const;

type SearchField = (typeof SEARCH_FIELDS)[number]["value"];

const TIP_W = 224;
const TIP_H = 62;

const peso = (n: number) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const compactPeso = (n: number) => (n >= 1000 ? `₱${(n / 1000).toFixed(1)}k` : `₱${Math.round(n || 0)}`);

const shortNum = (v: number) => (v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k" : String(v));

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
};

let bindHost: { set: (c: TipContent, x: number, y: number) => void; hide: () => void } | null = null;
let lastTip: TipContent | null = null;

const placeTip = (e: { clientX: number; clientY: number }) => {
  const x = Math.max(6, Math.min(window.innerWidth - TIP_W - 6, e.clientX + 14));
  const y = Math.max(6, Math.min(window.innerHeight - TIP_H - 6, e.clientY + 14));
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

const unbind = tipHide;

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
          className="pointer-events-none fixed z-[70] rounded-lg border border-[#23324a] bg-[#0d1b2b]/95 p-3 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur"
          style={{ left: tip.x, top: tip.y, width: TIP_W }}
        >
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#7CD4FD]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7CD4FD]" />
            {tip.c.heading}
          </p>
          <ul className="space-y-1">
            {tip.c.rows.map(([k, v], i) => (
              <li key={i} className="flex items-center justify-between gap-3 border-t border-white/10 pt-1 text-[11px]">
                <span className="text-slate-300">{k}</span>
                <span className="font-semibold tabular-nums">{v}</span>
              </li>
            ))}
          </ul>
          {tip.c.footer ? <p className="mt-2 text-[10px] text-slate-400">{tip.c.footer}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function ColumnChart({
  data,
  color,
  format,
}: {
  data: { label: string; value: number }[];
  color: string;
  format?: (v: number) => string;
}) {
  const [hot, setHot] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <div
        className="grid h-40 w-full items-end gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, data.length)}, minmax(0, 1fr))` }}
      >
        {data.map((d, i) => (
          <div
            key={d.label}
            className="relative h-full"
            onMouseEnter={(e) => {
              setHot(i);
              tipAt(e, {
                heading: d.label,
                rows: [
                  ["Value", format ? format(d.value) : String(d.value)],
                  ["Share", `${Math.round((d.value / Math.max(1, total)) * 100)}%`],
                ],
                footer: "Hover a column to inspect it.",
              });
            }}
            onMouseMove={tipFollow}
            onMouseLeave={() => {
              setHot(null);
              tipHide();
            }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t-[4px] transition-all duration-150"
              style={{
                height: `${Math.max(4, (d.value / max) * 100)}%`,
                background: color,
                opacity: hot === null || hot === i ? 1 : 0.25,
              }}
            >
              <span
                className={`absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-[#0d2240] tabular-nums transition-opacity ${
                  hot === i ? "opacity-100" : "opacity-0"
                }`}
              >
                {format ? format(d.value) : d.value}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-end justify-stretch gap-2">
        {data.map((d) => (
          <span key={d.label} className="flex-1 truncate text-center text-[11px] text-[#4a5b75]">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function donutArc(x: number, y: number, r: number, a0: number, a1: number) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const p0 = { X: x + r * Math.cos(rad(a0)), Y: y + r * Math.sin(rad(a0)) };
  const p1 = { X: x + r * Math.cos(rad(a1)), Y: y + r * Math.sin(rad(a1)) };
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${p0.X} ${p0.Y}A${r} ${r} 0 ${large} 1 ${p1.X} ${p1.Y}`;
}

type KpiCard = {
  head: ComponentType<{ className?: string }>;
  title: string;
  big: string;
  chips: [ComponentType<{ className?: string }>, string, string][];
  tip: (e: { clientX: number; clientY: number }) => void;
};export default function AnalyticsPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [hotDonut, setHotDonut] = useState<number | null>(null);

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

  const pendingCount = useMemo(() => rows.filter((r) => r.status === "pending").length, [rows]);
  const completedCount = useMemo(() => rows.filter((r) => r.status === "completed").length, [rows]);
  const reviewCount = useMemo(() => rows.filter((r) => r.status === "payment verification").length, [rows]);
  const inProgressCount = useMemo(
    () => rows.filter((r) => r.status === "processing" || r.status === "ready for pickup").length,
    [rows]
  );

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

  const verifiedPayments = useMemo(() => payments.filter((p) => p.status === "Verified"), [payments]);

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

  const donutTotal = documentData.reduce((s, d) => s + d.count, 0);
  const avgCopies = totalCopies / Math.max(1, rows.length);

  const segments = (() => {
    let a = 0;
    return documentData.map((d) => {
      const span = (d.count / Math.max(1, donutTotal)) * 360;
      const seg = { ...d, a0: a, a1: a + span };
      a += span;
      return seg;
    });
  })();

  const chipDefs = [
    { id: "pending", label: "raw", count: pendingCount, color: "#f59e0b" },
    { id: "payment verification", label: "review", count: reviewCount, color: "#3b82f6" },
    { id: "in-progress", label: "in progress", count: inProgressCount, color: "#8b5cf6" },
    { id: "completed", label: "done", count: completedCount, color: "#22c55e" },
  ];

  const groups = [
    { key: "completed", label: "Completed", count: completedCount, color: "#22c55e" },
    { key: "pending", label: "opened", count: pendingCount, color: "#f59e0b" },
    { key: "payment verification", label: "attention", count: reviewCount, color: "#3b82f6" },
  ];

  const metrics = [
    {
      value: shortNum(rows.length),
      label: "customer requests",
      sub: `${statusData.length} statuses tracked`,
      tip: bind({
        heading: "Customer requests",
        rows: [
          ["Total", shortNum(rows.length)],
          ["Pending", shortNum(pendingCount)],
          ["Completed", shortNum(completedCount)],
        ],
        footer: "All requests, all time.",
      }),
    },
    {
      value: shortNum(donutTotal),
      label: "documents demanded",
      sub: `${documentData.length} types in demand`,
      tip: bind({
        heading: "Document demand",
        rows: documentData.slice(0, 3).map((d) => [d.name, shortNum(d.count)] as [string, string]),
        footer: "Top document types.",
      }),
    },
    {
      value: shortNum(completedCount),
      label: "completed",
      sub: `${Math.round((completedCount / Math.max(1, rows.length)) * 100)}% of requests`,
      tip: bind({
        heading: "Completed",
        rows: [
          ["Completed", shortNum(completedCount)],
          ["Done rate", `${Math.round((completedCount / Math.max(1, rows.length)) * 100)}%`],
        ],
        footer: "Fully processed requests.",
      }),
    },
    {
      value: compactPeso(totalRevenue),
      label: "revenue (paid)",
      sub: `${paymentsInPeriod.length} receipts in period`,
      tip: bind({
        heading: "Paid revenue",
        rows: [
          ["Total", compactPeso(totalRevenue)],
          ["In period", compactPeso(sectionTotal)],
          ["Receipts", shortNum(paymentsInPeriod.length)],
        ],
        footer: "Based on verified payments.",
      }),
    },
  ];

  const kpiCards: KpiCard[] = [
    {
      head: Activity,
      title: "usage overview",
      big: "Totals",
      chips: [
        [TrendingUp, `${Math.round((completedCount / Math.max(1, rows.length)) * 100)}%`, "completion"],
        [Users, shortNum(rows.length), "requests"],
        [Inbox, shortNum(pendingCount), "pending"],
      ],
      tip: bind({
        heading: "Totals",
        rows: [
          ["Completed", shortNum(completedCount)],
          ["Pending", shortNum(pendingCount)],
          ["In progress", shortNum(inProgressCount)],
        ],
        footer: "Live request totals.",
      }),
    },
    {
      head: Eye,
      title: "demand",
      big: shortNum(documentData.length),
      chips: [
        [BarChart3, shortNum(donutTotal), "documents"],
        [
          FileText,
          documentData[0] ? `${Math.round((documentData[0].count / Math.max(1, donutTotal)) * 100)}%` : "—",
          documentData[0]?.name ?? "top doc",
        ],
      ],
      tip: bind({
        heading: "Document demand",
        rows: documentData.slice(0, 3).map((d) => [d.name, shortNum(d.count)] as [string, string]),
        footer: "Top requested documents.",
      }),
    },
    {
      head: Clock,
      title: "avg copies",
      big: avgCopies.toFixed(1),
      chips: [
        [ArrowUpRight, shortNum(totalCopies), "total copies"],
        [Calendar, today.toLocaleDateString("en-PH", { month: "short" }), "period"],
      ],
      tip: bind({
        heading: "Copies per request",
        rows: [
          ["Avg", avgCopies.toFixed(1)],
          ["Total copies", shortNum(totalCopies)],
        ],
        footer: "Average copy count across requests.",
      }),
    },
    {
      head: DollarSign,
      title: "revenue",
      big: compactPeso(totalRevenue),
      chips: [
        [CheckCircle2, shortNum(verifiedPayments.length), "paid"],
        [TrendingUp, shortNum(paymentsInPeriod.length), "in period"],
      ],
      tip: bind({
        heading: "Revenue",
        rows: [
          ["Total", compactPeso(totalRevenue)],
          ["This period", compactPeso(sectionTotal)],
          ["Receipts", shortNum(verifiedPayments.length)],
        ],
        footer: "Verified payments only.",
      }),
    },
  ];

  const leaders = (() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const p of verifiedPayments) {
      const n = p.requests?.profiles?.full_name;
      if (!n) continue;
      map[n] = map[n] || { count: 0, total: 0 };
      map[n].count += 1;
      map[n].total += p.amount || 0;
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  })();

  const recentMutations = (() => {
    return paymentsInPeriod
      .slice()
      .sort(
        (a, b) =>
          new Date(b.verified_at ?? b.created_at).getTime() -
          new Date(a.verified_at ?? a.created_at).getTime()
      )
      .slice(0, 5);
  })();

  return (
    <TooltipHost>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7C3AED]">Analytics</p>
            <h1 className="mt-1 text-[24px] font-bold tracking-tight text-[#0d2240]">Dashboard overview</h1>
            <p className="mt-1 text-sm text-[#4a5b75]">Request volume, demand and revenue at a glance.</p>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e8f1] bg-white px-3 py-1.5 text-xs text-[#4a5b75]"
            onMouseEnter={bind({
              heading: "All time",
              rows: [["Scope", "No date filter applied."]],
              footer: "Analytics reflect all time.",
            })}
            onMouseLeave={unbind}
          >
            <Calendar className="h-3.5 w-3.5 text-[#7C3AED]" />
            All time
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {metrics.map((m) => (
            <button
              key={m.label}
              onMouseEnter={m.tip}
              onMouseLeave={unbind}
              className="rounded-[14px] border border-[#e2e8f1] bg-white p-4 text-left transition-colors hover:border-[#d5c7f2] hover:bg-[#FAF7FF]"
            >
              <p className="text-[22px] font-bold leading-none text-[#0d2240] tabular-nums">{m.value}</p>
              <p className="mt-1 text-[11px] font-semibold text-[#7C3AED]">{m.label}</p>
              <p className="mt-0.5 text-[11px] text-[#8494ab]">{m.sub}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-[14px] border border-[#e2e8f1] bg-white p-3">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-[#8494ab]">Queue</span>
          {chipDefs.map((c) => (
            <span
              key={c.id}
              onMouseEnter={bind({
                heading: c.label,
                rows: [
                  ["Stage", titleCaseStatus(c.id)],
                  ["Requests", shortNum(c.count)],
                ],
                footer: "Share of the live queue.",
              })}
              onMouseLeave={unbind}
              className="inline-flex cursor-default items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: `${c.color}1f`, color: c.color }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
              {c.label} · {c.count}
            </span>
          ))}
        </div><div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((k, i) => (
            <div
              key={i}
              onMouseEnter={k.tip}
              onMouseLeave={unbind}
              className="cursor-default rounded-[14px] border border-[#e2e8f1] bg-white p-4"
            >
              <div className="flex items-center gap-2">
                <k.head className="h-4 w-4 text-[#7C3AED]" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.title}</p>
              </div>
              <p className="mt-2 text-[20px] font-bold text-[#0d2240] tabular-nums">{k.big}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {k.chips.map(([Icon, val, label], j) => (
                  <span
                    key={j}
                    className="inline-flex items-center gap-1 rounded-md bg-[#f4f2fb] px-2 py-1 text-[10px] font-medium text-[#574b7a]"
                  >
                    <Icon className="h-3 w-3 text-[#7C3AED]" />
                    <b className="text-[#33265c]">{val}</b> {label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-[14px] border border-[#e2e8f1] bg-white p-5">
            <div className="mb-4">
              <h2 className="text-[15px] font-semibold text-[#0d2240]">Categories</h2>
              <p className="text-xs text-[#8494ab]">Stage share across the queue</p>
            </div>
            <div className="space-y-2.5">
              {groups.map((g) => {
                const share = (g.count / Math.max(1, rows.length)) * 100;
                const weight = (g.count / Math.max(1, donutTotal)) * 100;
                return (
                  <div
                    key={g.key}
                    onMouseEnter={bind({
                      heading: g.label,
                      rows: [
                        ["Requests", shortNum(g.count)],
                        ["Stage share", `${share.toFixed(1)}%`],
                        ["Weight", `${weight.toFixed(1)}%`],
                      ],
                      footer: "Share of the live queue.",
                    })}
                    onMouseLeave={unbind}
                    className="cursor-default"
                  >
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 font-semibold text-[#0d2240]">
                        <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
                        {g.label}
                      </span>
                      <span className="text-[#8494ab] tabular-nums">{shortNum(g.count)} requests</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-[#f4f6fa] px-3 py-2">
                        <p className="text-[15px] font-bold text-[#0d2240] tabular-nums">{Math.round(share)}%</p>
                        <p className="text-[9px] uppercase tracking-wider text-[#8494ab]">stage</p>
                      </div>
                      <div className="rounded-lg bg-[#f4f6fa] px-3 py-2">
                        <p className="text-[15px] font-bold text-[#0d2240] tabular-nums">{shortNum(g.count)}</p>
                        <p className="text-[9px] uppercase tracking-wider text-[#8494ab]">requests</p>
                      </div>
                      <div className="rounded-lg bg-[#f4f6fa] px-3 py-2">
                        <p className="text-[15px] font-bold text-[#7C3AED] tabular-nums">= {weight.toFixed(1)}%</p>
                        <p className="text-[9px] uppercase tracking-wider text-[#8494ab]">weight</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[14px] border border-[#e2e8f1] bg-white p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-semibold text-[#0d2240]">Documents in demand</h2>
                <p className="text-xs text-[#8494ab]">Hover a slice or a row to inspect</p>
              </div>
              {selectedDoc && (
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-[#c5d8f5] bg-[#e8f0fc] px-2.5 text-xs font-medium text-[#0d47a1] hover:bg-[#d9e7fb]"
                >
                  Clear filter
                </button>
              )}
            </div>
            {segments.length === 0 ? (
              <p className="text-sm text-[#8494ab]">No requests yet.</p>
            ) : (
              <div className="grid items-center gap-6 lg:grid-cols-[200px_1fr]">
                <div className="relative mx-auto h-52 w-52 lg:mx-0">
                  <div className="absolute inset-0 -rotate-90">
                    <svg viewBox="-16 -16 232 232" className="h-full w-full">
                      <circle cx="100" cy="100" r="80" fill="#f4f6fa" />
                      {segments.map((s, i) => (
                        <path
                          key={s.name}
                          d={donutArc(100, 100, 80, s.a0, s.a1)}
                          fill="none"
                          stroke={s.color}
                          strokeWidth={26}
                          strokeLinecap="butt"
                          className="cursor-pointer transition-opacity"
                          style={{ opacity: hotDonut === null || hotDonut === i ? 1 : 0.15 }}
                          onMouseEnter={(e) => {
                            setHotDonut(i);
                            tipAt(e, {
                              heading: s.name,
                              rows: [
                                ["Requests", shortNum(s.count)],
                                ["Share", `${Math.round((s.count / Math.max(1, donutTotal)) * 100)}%`],
                              ],
                              footer: "Click to filter the payments report.",
                            });
                          }}
                          onMouseMove={tipFollow}
                          onMouseLeave={() => {
                            setHotDonut(null);
                            tipHide();
                          }}
                          onClick={() => setSelectedDoc(selectedDoc === s.name ? null : s.name)}
                        />
                      ))}
                    </svg>
                  </div>
                  <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                    <p className="text-[24px] font-bold leading-none text-[#0d2240] tabular-nums">
                      {hotDonut !== null ? segments[hotDonut].count : donutTotal}
                    </p>
                    <p className="mt-1 max-w-[100px] truncate text-[11px] text-[#8494ab]">
                      {hotDonut !== null ? segments[hotDonut].name : "requests"}
                    </p>
                  </div>
                </div>
                <ul className="space-y-1">
                  {segments.map((s, i) => (
                    <li key={s.name}>
                      <button
                        className={`grid w-full grid-cols-[12px_1fr_auto_44px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                          hotDonut === i
                            ? "bg-[#f4f2fb]"
                            : selectedDoc === s.name
                            ? "bg-[#e8f0fc]"
                            : "hover:bg-[#faf7ff]"
                        }`}
                        onMouseEnter={(e) => {
                          setHotDonut(i);
                          tipAt(e, {
                            heading: s.name,
                            rows: [
                              ["Requests", shortNum(s.count)],
                              ["Share", `${Math.round((s.count / Math.max(1, donutTotal)) * 100)}%`],
                            ],
                            footer: "Click to filter the payments report.",
                          });
                        }}
                        onMouseMove={tipFollow}
                        onMouseLeave={() => {
                          setHotDonut(null);
                          tipHide();
                        }}
                        onClick={() => setSelectedDoc(selectedDoc === s.name ? null : s.name)}
                      >
                        <span className="h-3 w-3 rounded" style={{ background: s.color }} />
                        <span className="text-[#0d2240]">{s.name}</span>
                        <span className="font-semibold text-[#0d2240] tabular-nums">{s.count}</span>
                        <span className="text-right text-xs text-[#8494ab] tabular-nums">
                          {Math.round((s.count / Math.max(1, donutTotal)) * 100)}%
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div><div className="rounded-[14px] border border-[#e2e8f1] bg-white p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold text-[#0d2240]">Revenue</h2>
              <p className="text-[26px] font-semibold leading-tight text-[#00875a]">{peso(sectionTotal)}</p>
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.6fr]">
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0d2240]">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Revenue by month ({displayYear})
              </h3>
              {revenueMonthData.length === 0 ? (
                <p className="text-sm text-[#8494ab]">No verified payments in {displayYear}.</p>
              ) : (
                <ColumnChart data={revenueMonthData} color="#00875a" format={compactPeso} />
              )}

              <div className="mt-5">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8494ab]">
                  <Inbox className="h-3.5 w-3.5" /> Latest payments
                </h4>
                <div className="space-y-1.5">
                  {recentMutations.length === 0 ? (
                    <p className="text-sm text-[#8494ab]">No payments in this period.</p>
                  ) : (
                    recentMutations.map((p) => (
                      <div
                        key={p.id}
                        onMouseEnter={bind({
                          heading: p.requests?.tracking_code ?? "#" + (p.reference_number ?? p.id),
                          rows: [
                            ["Receipt", p.reference_number ?? "—"],
                            ["Document", p.requests?.documents?.name ?? "—"],
                            ["Method", methodLabel(p.payment_method)],
                          ],
                          footer: `Verified ${new Date(p.verified_at ?? p.created_at).toLocaleDateString("en-PH")} · ${peso(p.amount || 0)}`,
                        })}
                        onMouseLeave={unbind}
                        className="flex cursor-default items-center justify-between rounded-lg border border-[#eef2f8] bg-[#fafcff] px-3 py-2 text-[12px]"
                      >
                        <span className="truncate text-[#0d2240]">{p.requests?.profiles?.full_name ?? "Anonymous"}</span>
                        <span className="font-semibold text-emerald-700 tabular-nums">{peso(p.amount || 0)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[#eef2f8] bg-[#fafcff] p-4">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8494ab]">
                  <Users className="h-3.5 w-3.5" /> Top requestors
                </h4>
                {leaders.length === 0 ? (
                  <p className="text-xs text-[#8494ab]">No verified payments yet.</p>
                ) : (
                  <ol className="space-y-1">
                    {leaders.map((l, i) => (
                      <li
                        key={`${l.name}-${i}`}
                        onMouseEnter={bind({
                          heading: `#${i + 1} ${l.name}`,
                          rows: [
                            ["Receipts", shortNum(l.count)],
                            ["Paid", compactPeso(l.total)],
                          ],
                          footer: i === 0 ? "Actionable fix: tabulation key access." : undefined,
                        })}
                        onMouseLeave={unbind}
                        className="flex cursor-default items-center justify-between rounded-md px-1.5 py-1 text-[12px]"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                              i === 0 ? "bg-[#7C3AED] text-white" : "bg-[#ede9f7] text-[#574b7a]"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="truncate text-[#0d2240]">{l.name}</span>
                        </span>
                        <span className="font-semibold text-[#0d2240] tabular-nums">{shortNum(l.count)}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {leaders[0] ? (
                  <p className="mt-2 rounded-md bg-[#f4f2fb] px-2 py-1.5 text-[10px] font-medium text-[#574b7a]">
                    Actionable fix: {leaders[0].name} leads demand — grant rr/tabulation key access.
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-[#eef2f8] bg-[#fafcff] p-4">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8494ab]">
                  <KeyRound className="h-3.5 w-3.5" /> Key tips
                </h4>
                <ul className="space-y-1.5 text-[12px] text-[#4a5b75]">
                  <li
                    className="flex items-center gap-2"
                    onMouseEnter={bind({
                      heading: "Inspector",
                      rows: [["Hover", "Cards, chips and columns show a detail tooltip."], ["Inspect", "Chart columns highlight as you move across them."]],
                      footer: "Analytics inspector.",
                    })}
                    onMouseLeave={unbind}
                  >
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#ede9f7] text-[#7C3AED]">
                      <MousePointer2 className="h-3 w-3" />
                    </span>
                    Hover cards, chips and columns to inspect.
                  </li>
                  <li
                    className="flex items-center gap-2"
                    onMouseEnter={bind({
                      heading: "Filter",
                      rows: [
                        ["Donut", "Click a slice or a row to filter the payments report."],
                        ["Clear", "Use the Clear filter chip."],
                      ],
                      footer: "Donut selection drives the report.",
                    })}
                    onMouseLeave={unbind}
                  >
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#ede9f7] text-[#7C3AED]">
                      <BarChart3 className="h-3 w-3" />
                    </span>
                    Click a donut slice to filter the report.
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-[#eef2f8] bg-[#fafcff] p-4">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8494ab]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Marking hints
                </h4>
                <div className="space-y-1 font-mono text-[10px] text-[#8494ab]">
                  <p>
                    mark: {"{K}"}_OK = {Math.round((completedCount / Math.max(1, rows.length)) * 100)}%
                  </p>
                  <p>
                    mark: {"{K}"}_REV = {Math.round((reviewCount / Math.max(1, rows.length)) * 100)}%
                  </p>
                  <p>mark: {"{K}"}_DONUT toggles the donut readout</p>
                </div>
              </div>
            </div>
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
              onMouseEnter={bind({
                heading: selectedDoc,
                rows: [["Filter", "Restricting the report to this document."]],
                footer: "Click to remove the filter.",
              })}
              onMouseLeave={unbind}
            >
              {selectedDoc} <span aria-hidden>✕</span>
            </button>
          )}
        </div>

        <div className="rounded-[14px] border border-[#e2e8f1] bg-white p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[#0d2240]">Payments report</h2>
              <p className="text-xs text-[#8494ab]">
                {filteredPayments.length} of {verifiedPayments.length} receipts shown
              </p>
            </div>
            <button
              onClick={exportCsv}
              onMouseEnter={bind({
                heading: "Export",
                rows: [
                  ["Format", "CSV"],
                  ["Rows", shortNum(filteredPayments.length)],
                ],
                footer: "Downloads payments-report.csv.",
              })}
              onMouseLeave={unbind}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[10px] bg-[#0d47a1] px-3.5 text-sm font-semibold text-white hover:bg-[#0b3d91]"
            >
              Export CSV <ArrowRight className="h-3.5 w-3.5" />
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

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e2e8f1] pt-1 text-[11px] text-[#8494ab]">
          <span className="inline-flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 text-[#7C3AED]" /> Live from requests &amp; payments
          </span>
          <span>All payments in Philippine Pesos (PHP)</span>
        </div>
      </div>
    </TooltipHost>
  );
}