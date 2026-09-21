"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import "./analytics.css";

type Scope = "full" | "goodmoral";

type Fact = {
  id: number;
  tracking_code: string;
  status: string;
  copies: number;
  created_at: string;
  pickup_at: string | null;
  documentName: string;
  documentFee: number;
  fullName: string;
  course: string | null;
  yearLevel: string | null;
  enrollmentStatus: string | null;
  isAlumni: boolean;
  completedAt: string | null;
  readyAt: string | null;
  lastStatusChangeAt: string | null;
  paidAmount: number;
  paymentMethod: string | null;
  verifiedAt: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  "payment verification": "Payment verification",
  processing: "Processing",
  "ready for pickup": "Ready for pickup",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "var(--pending)",
  processing: "var(--processing)",
  completed: "var(--completed)",
  "ready for pickup": "var(--pickup)",
  rejected: "var(--rejected)",
  "payment verification": "#3b82f6",
  cancelled: "#64748b",
};

const OPEN_STATUSES = ["pending", "payment verification", "processing", "ready for pickup"];

const pesoS = (n: number) =>
  "₱" +
  Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const esc = (s: unknown) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]);

const niceMax = (v: number) => {
  const x = v || 1;
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const m = x / p;
  const step = m > 5 ? 2 : 1;
  return Math.ceil(x / p / step) * p * step;
};

const monthLabel = (key: string) => {
  const d = new Date(key + "-28T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short" }) + " " + String(d.getFullYear()).slice(2);
};

const monthShort = (key: string) => new Date(key + "-28T12:00:00").toLocaleDateString("en-US", { month: "short" });

const mk = (title: string, rows: [string, unknown][], color?: string) =>
  `<b>${color ? `<i class="sw" style="background:${color}"></i>` : ""}${esc(title)}</b>` +
  rows.map(([k, v]) => `<div class="row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join("");

const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

const annulus = (cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number) => {
  if (a1 - a0 >= 359.999) {
    return `M ${cx} ${cy - rOuter} A ${rOuter} ${rOuter} 0 1 1 ${cx - 0.01} ${cy - rOuter} Z M ${cx - 0.01} ${cy - rInner} A ${rInner} ${rInner} 0 1 0 ${cx} ${cy - rInner} Z`;
  }
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = polar(cx, cy, rOuter, a0);
  const [x1, y1] = polar(cx, cy, rOuter, a1);
  const [x2, y2] = polar(cx, cy, rInner, a1);
  const [x3, y3] = polar(cx, cy, rInner, a0);
  return `M ${x0} ${y0} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${rInner} ${rInner} 0 ${large} 0 ${x3} ${y3} Z`;
};

function Donut({
  items,
  centerValue,
  centerLabel = "total",
  hrefFor,
}: {
  items: { label: string; value: number; color: string; tipRows?: [string, unknown][] }[];
  centerValue?: string;
  centerLabel?: string;
  hrefFor?: (label: string) => string | undefined;
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!total) return <div className="empty">No data yet.</div>;
  let acc = 0;
  const segments = items
    .filter((i) => i.value > 0)
    .map((i) => {
      const a0 = (acc / total) * 360;
      acc += i.value;
      const a1 = (acc / total) * 360;
      const href = hrefFor ? hrefFor(i.label) : undefined;
      return { ...i, a0, a1, href };
    });
  const seg = (s: (typeof segments)[number]) => (
    <path
      d={annulus(130, 130, 104, 64, s.a0, s.a1)}
      fill={s.color}
      stroke="#fff"
      strokeWidth={1.5}
    />
  );
  return (
    <div className="donut-wrap">
      <div className="donut">
        <svg viewBox="0 0 260 260" role="img" aria-label="Donut chart">
          {segments.map((s, i) =>
            s.href ? (
              <a key={i} href={s.href} aria-label={`Open ${s.label} in requests list`}>
                {seg(s)}
              </a>
            ) : (
              <g key={i}>{seg(s)}</g>
            )
          )}
        </svg>
        <div className="center">
          <b>{centerValue ?? total}</b>
          <span>{centerLabel}</span>
        </div>
      </div>
      <ul className="legend">
        {segments.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              tabIndex={0}
              data-tip={mk(s.label, s.tipRows ?? [["Value", s.value], ["Share", Math.round((s.value / total) * 100) + "%"]], s.color)}
              onClick={() => {
                if (s.href) window.location.href = s.href;
              }}
            >
              <span className="dot" style={{ background: s.color }} />
              <span>{s.label}</span>
              <span className="cnt">{s.value}</span>
              <span className="pct">{Math.round((s.value / total) * 100)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const dayDiff = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 86400000;

const stats = (arr: number[]) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const avg = s.reduce((x, y) => x + y, 0) / s.length;
  return {
    n: s.length,
    avg,
    median: s[Math.floor(s.length / 2)],
    p90: s[Math.min(s.length - 1, Math.floor(s.length * 0.9))],
  };
};

const fmtDays = (d: number) =>
  d < 1 ? `${Math.round(d * 24)}h` : d < 2 ? `${d.toFixed(1)}d` : `${Math.round(d)}d`;

type HistEntry = { completed: string | null; ready: string | null; last: string | null };
type PayEntry = { amount: number; method: string | null; verified: string | null };

function makeFact(r: Record<string, unknown>, h: HistEntry | undefined, pay?: PayEntry): Fact {
  const prof = (r.profiles ?? null) as Record<string, unknown> | null;
  const doc = (r.documents ?? null) as Record<string, unknown> | null;
  return {
    id: Number(r.id),
    tracking_code: String(r.tracking_code ?? ""),
    status: String(r.status ?? "Pending"),
    copies: Number(r.copies ?? 1) || 1,
    created_at: String(r.created_at ?? new Date().toISOString()),
    pickup_at: (r.pickup_at as string | null) ?? null,
    documentName: String(doc?.name ?? "Unknown"),
    documentFee: Number(doc?.fee ?? 0) || 0,
    fullName: String(prof?.full_name ?? ""),
    course: (prof?.course as string | null) ?? null,
    yearLevel: (prof?.year_level as string | null) ?? null,
    enrollmentStatus: (prof?.enrollment_status as string | null) ?? null,
    isAlumni: Boolean(prof?.is_alumni),
    completedAt: h?.completed ?? null,
    readyAt: h?.ready ?? null,
    lastStatusChangeAt: h?.last ?? null,
    paidAmount: pay?.amount ?? 0,
    paymentMethod: pay?.method ?? null,
    verifiedAt: pay?.verified ?? null,
  };
}

function factFromView(r: Record<string, unknown>): Fact {
  return {
    id: Number(r.id),
    tracking_code: String(r.tracking_code ?? ""),
    status: String(r.status ?? "Pending"),
    copies: Number(r.copies ?? 1) || 1,
    created_at: String(r.created_at ?? new Date().toISOString()),
    pickup_at: (r.pickup_at as string | null) ?? null,
    documentName: String(r.document_name ?? "Unknown"),
    documentFee: Number(r.document_fee ?? 0) || 0,
    fullName: String(r.full_name ?? ""),
    course: (r.course as string | null) ?? null,
    yearLevel: (r.year_level as string | null) ?? null,
    enrollmentStatus: (r.enrollment_status as string | null) ?? null,
    isAlumni: Boolean(r.is_alumni),
    completedAt: (r.completed_at as string | null) ?? null,
    readyAt: (r.ready_at as string | null) ?? null,
    lastStatusChangeAt: (r.last_status_change_at as string | null) ?? null,
    paidAmount: Number(r.paid_amount ?? 0) || 0,
    paymentMethod: (r.payment_method as string | null) ?? null,
    verifiedAt: (r.verified_at as string | null) ?? null,
  };
}

async function loadFacts(supabase: SupabaseClient): Promise<Fact[]> {
  const { data: viewData, error: viewErr } = await supabase
    .from("analytics_request_facts")
    .select("*");
  if (!viewErr && Array.isArray(viewData)) {
    return (viewData as Record<string, unknown>[]).map(factFromView);
  }

  const [{ data: reqs }, { data: hist }, { data: pays }] = await Promise.all([
    supabase
      .from("requests")
      .select("id, tracking_code, status, copies, created_at, pickup_at, documents(id, name, fee), profiles(full_name, course, year_level, enrollment_status, is_alumni)"),
    supabase.from("status_history").select("request_id, status, changed_at"),
    supabase.from("payments").select("request_id, amount, status, payment_method, verified_at"),
  ]);

  const histByReq = new Map<number, HistEntry>();
  for (const h of hist ?? []) {
    const e = histByReq.get(h.request_id) ?? { completed: null, ready: null, last: null };
    const s = String(h.status ?? "").toLowerCase();
    const t = String(h.changed_at ?? "");
    if (s.includes("completed")) {
      if (!e.completed || t < e.completed) e.completed = t;
    }
    if (s.includes("ready")) {
      if (!e.ready || t < e.ready) e.ready = t;
    }
    if (!e.last || t > e.last) e.last = t;
    histByReq.set(h.request_id, e);
  }

  const payByReq = new Map<number, PayEntry>();
  for (const pay of pays ?? []) {
    if (String(pay.status ?? "").toLowerCase() !== "verified") continue;
    const e = payByReq.get(pay.request_id) ?? { amount: 0, method: null, verified: null };
    e.amount += Number(pay.amount ?? 0) || 0;
    if (pay.payment_method && !e.method) e.method = pay.payment_method;
    if (pay.verified_at && !e.verified) e.verified = pay.verified_at;
    payByReq.set(pay.request_id, e);
  }

  return (reqs ?? []).map((r) => makeFact(r as unknown as Record<string, unknown>, histByReq.get(r.id), payByReq.get(r.id)));
}

function Columns({
  items,
  green = false,
  fmt = (v: number) => String(v),
  tip,
}: {
  items: { label: string; value: number; href?: string }[];
  green?: boolean;
  fmt?: (v: number) => string;
  tip?: (item: { label: string; value: number; href?: string }, idx: number, arr: { label: string; value: number; href?: string }[]) => string | undefined;
}) {
  const max = niceMax(Math.max(...items.map((i) => i.value), 1));
  const ticks = [0, 1, 2, 3, 4].map((i) => fmt(Math.round((max / 4) * i)));
  return (
    <div>
      <div className={`cols${green ? " green" : ""}`} role="img" aria-label="Column chart">
        <div className="axis">
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        {items.map((it, idx) => {
          const inner = (
            <>
              <span className="v">{fmt(it.value)}</span>
              <div className="rect" style={{ height: `${(it.value / max) * 100}%` }} />
            </>
          );
          return it.href ? (
            <a
              key={`${it.label}-${idx}`}
              href={it.href}
              className={`col${green ? " green" : ""}`}
              tabIndex={0}
              data-tip={tip ? tip(it, idx, items) : undefined}
              aria-label={`Open ${it.label} in requests list`}
            >
              {inner}
            </a>
          ) : (
            <div
              key={`${it.label}-${idx}`}
              className={`col${green ? " green" : ""}`}
              tabIndex={0}
              data-tip={tip ? tip(it, idx, items) : undefined}
            >
              {inner}
            </div>
          );
        })}
      </div>
      <div className="xlabels">
        {items.map((it, idx) => (
          <span key={idx}>{it.label}</span>
        ))}
      </div>
    </div>
  );
}

function BarRows({
  rows,
  unit = "requests",
}: {
  rows: { label: string; value: number; color: string; href?: string; tipRows?: [string, unknown][] }[];
  unit?: string;
}) {
  if (!rows.length) return <div className="empty">No data yet.</div>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <div className="bars">
      {rows.map((r) => {
        const inner = (
          <>
            <span>{r.label}</span>
            <div className="track">
              <div className="fill" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
            </div>
            <span className="n">{r.value}</span>
          </>
        );
        return r.href ? (
          <a
            key={r.label}
            href={r.href}
            className="bar-row"
            tabIndex={0}
            aria-label={`Open ${r.label} in requests list`}
            data-tip={mk(r.label, r.tipRows ?? [
              [unit, r.value],
              ["Share", Math.round((r.value / total) * 100) + "%"],
            ], r.color)}
          >
            {inner}
          </a>
        ) : (
          <div
            key={r.label}
            className="bar-row"
            tabIndex={0}
            data-tip={mk(r.label, r.tipRows ?? [
              [unit, r.value],
              ["Share", Math.round((r.value / total) * 100) + "%"],
            ], r.color)}
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}

type MonthBucket = { key: string; label: string; short: string; count: number };

export default function AnalyticsDashboard({ scope = "full" }: { scope?: Scope }) {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [volPeriod, setVolPeriod] = useState<"month" | "week" | "day">("month");
  const [listBase, setListBase] = useState("");
  const tipEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const path = window.location.pathname;
    setListBase(
      path.startsWith("/admin")
        ? "/admin/requests"
        : path.startsWith("/guidance")
        ? "/guidance/approvals"
        : "/registrar/requests"
    );
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        const list = await loadFacts(supabase);
        setFacts(list);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const scoped = useMemo<Fact[]>(() => {
    if (scope === "goodmoral") {
      return facts.filter((f) => /good moral/i.test(f.documentName));
    }
    return facts;
  }, [facts, scope]);

  const total = scoped.length;

  const byStatus = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of scoped) {
      const k = String(f.status).toLowerCase();
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].map(([k, v]) => ({ key: k, count: v }));
  }, [scoped]);

  const waiting = useMemo(
    () => scoped.filter((f) => ["pending", "payment verification"].includes(f.status.toLowerCase())).length,
    [scoped]
  );
  const open = useMemo(() => scoped.filter((f) => OPEN_STATUSES.includes(f.status.toLowerCase())).length, [scoped]);

  const byDocument = useMemo(() => {
    const m = new Map<string, { count: number; copies: number }>();
    for (const f of scoped) {
      const e = m.get(f.documentName) ?? { count: 0, copies: 0 };
      e.count += 1;
      e.copies += f.copies;
      m.set(f.documentName, e);
    }
    return [...m.entries()]
      .map(([name, v], i) => ({ name, ...v, color: ["#0b3d91", "#1565c0", "#42a5f5", "#1e88e5", "#0d5bb5", "#90caf9", "#5c8fd6", "#1976d2"][i % 8] }))
      .sort((a, b) => b.count - a.count);
  }, [scoped]);

  const releaseStats = useMemo(
    () => stats(scoped.filter((f) => f.completedAt).map((f) => dayDiff(f.created_at, f.completedAt!))),
    [scoped]
  );
  const readyStats = useMemo(
    () => stats(scoped.filter((f) => f.readyAt).map((f) => dayDiff(f.created_at, f.readyAt!))),
    [scoped]
  );

  const releaseBins = useMemo(() => {
    const bins = [
      { label: "≤ 1d", from: 0, to: 1, color: "var(--completed)" },
      { label: "1–3d", from: 1, to: 3, color: "var(--pickup)" },
      { label: "3–7d", from: 3, to: 7, color: "#3b82f6" },
      { label: "7–14d", from: 7, to: 14, color: "var(--pending)" },
      { label: "> 14d", from: 14, to: Infinity, color: "var(--rejected)" },
    ];
    const days = scoped.filter((f) => f.completedAt).map((f) => dayDiff(f.created_at, f.completedAt!));
    return bins.map((b) => ({ label: b.label, value: days.filter((d) => d >= b.from && d < b.to).length, color: b.color }));
  }, [scoped]);

  const stuckByStatus = useMemo(() => {
    const m = new Map<string, { n: number; days: number; stale: number }>();
    for (const f of scoped) {
      if (!OPEN_STATUSES.includes(f.status.toLowerCase())) continue;
      const e = m.get(f.status.toLowerCase()) ?? { n: 0, days: 0, stale: 0 };
      const days = dayDiff(f.created_at, new Date().toISOString());
      e.n += 1;
      e.days += days;
      if (days > 7) e.stale += 1;
      m.set(f.status.toLowerCase(), e);
    }
    return [...m.entries()]
      .map(([k, v]) => ({ key: k, status: STATUS_LABELS[k] ?? k, ...v, avg: v.n ? v.days / v.n : 0 }))
      .sort((a, b) => b.avg - a.avg);
  }, [scoped]);

  const monthSeries = useMemo(() => {
    const now = new Date();
    const out: MonthBucket[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      out.push({ key, label: monthLabel(key), short: monthShort(key), count: 0 });
    }
    const byKey = new Map<string, number>();
    for (const f of scoped) {
      const k = f.created_at.slice(0, 7);
      byKey.set(k, (byKey.get(k) ?? 0) + 1);
    }
    for (const b of out) b.count = byKey.get(b.key) ?? 0;
    return out;
  }, [scoped]);

  const weekSeries = useMemo(() => {
    const now = new Date();
    const startOfWeek = (d: Date) => {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
      return x;
    };
    const out: { key: string; label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = startOfWeek(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7));
      const key = `${d.toISOString().slice(0, 10)}`;
      out.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 });
    }
    for (const f of scoped) {
      const d = new Date(f.created_at);
      const wk = startOfWeek(d).toISOString().slice(0, 10);
      const hit = out.find((b) => b.key === wk);
      if (hit) hit.count += 1;
    }
    return out;
  }, [scoped]);

  const daySeries = useMemo(() => {
    const now = new Date();
    const out: { key: string; label: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out.push({ key, label: i % 3 === 0 ? `${d.getMonth() + 1}/${d.getDate()}` : "", count: 0 });
    }
    const byKey = new Map<string, number>();
    for (const f of scoped) {
      const k = f.created_at.slice(0, 10);
      byKey.set(k, (byKey.get(k) ?? 0) + 1);
    }
    for (const b of out) b.count = byKey.get(b.key) ?? 0;
    return out;
  }, [scoped]);

  const volume = volPeriod === "month" ? monthSeries : volPeriod === "week" ? weekSeries : daySeries;
  const periodTotal = volume.reduce((s, b) => s + b.count, 0);
  const volumeLinks = useMemo(
    () =>
      volume.map((b) => {
        if (volPeriod === "month") {
          const [y, m] = b.key.split("-").map(Number);
          const last = new Date(y, m, 0).getDate();
          return { from: `${b.key}-01`, to: `${b.key}-${String(last).padStart(2, "0")}` };
        }
        if (volPeriod === "week") {
          const e = new Date(new Date(b.key + "T00:00:00").getTime() + 6 * 864e5);
          return { from: b.key, to: e.toISOString().slice(0, 10) };
        }
        return { from: b.key, to: b.key };
      }),
    [volume, volPeriod]
  );
  const linkable = scope === "full" && listBase;
  const statusLink = (key: string) => (listBase ? `${listBase}?status=${encodeURIComponent(key)}` : "");
  const firstHalf = volume.slice(0, Math.floor(volume.length / 2)).reduce((s, b) => s + b.count, 0);
  const secondHalf = volume.slice(Math.floor(volume.length / 2)).reduce((s, b) => s + b.count, 0);
  const delta = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : null;

  const paidFacts = useMemo(() => scoped.filter((f) => f.paidAmount > 0), [scoped]);
  const totalRevenue = paidFacts.reduce((s, f) => s + f.paidAmount, 0);
  const gcashRevenue = paidFacts.filter((f) => /gcash/i.test(f.paymentMethod ?? "")).reduce((s, f) => s + f.paidAmount, 0);
  const nonGcashRevenue = totalRevenue - gcashRevenue;
  const avgPaid = paidFacts.length ? totalRevenue / paidFacts.length : 0;

  const revenueByDoc = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of paidFacts) m.set(f.documentName, (m.get(f.documentName) ?? 0) + f.paidAmount);
    return [...m.entries()]
      .map(([name, amount], i) => ({ name, amount, color: ["#00875a", "#10b981", "#22c55e", "#6ee7b7", "#059669", "#34d399", "#0d9488", "#16a34a"][i % 8] }))
      .sort((a, b) => b.amount - a.amount);
  }, [paidFacts]);

  const revenueByMonth = useMemo(() => {
    const out = monthSeries.map((m) => ({ ...m, revenue: 0 }));
    const idx = new Map(out.map((m, i) => [m.key, i]));
    for (const f of paidFacts) {
      const k = (f.verifiedAt ?? f.created_at).slice(0, 7);
      const i = idx.get(k);
      if (i !== undefined) out[i].revenue += f.paidAmount;
    }
    return out;
  }, [paidFacts, monthSeries]);

  const alumniCount = useMemo(() => scoped.filter((f) => f.isAlumni).length, [scoped]);
  const studentsCount = total - alumniCount;

  const courseTop = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of scoped) {
      if (!f.course) continue;
      m.set(f.course, (m.get(f.course) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([name, count], i) => ({ name, count, color: ["#0b3d91", "#1565c0", "#42a5f5", "#1e88e5", "#90caf9", "#5c8fd6"][i % 6] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [scoped]);

  const yearTop = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of scoped) {
      if (!f.yearLevel) continue;
      m.set(f.yearLevel, (m.get(f.yearLevel) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [scoped]);

  const seasonality = useMemo(() => {
    const m = new Array(12).fill(0);
    for (const f of scoped) m[new Date(f.created_at).getMonth()] += 1;
    return m.map((count, i) => ({
      label: new Date(2000, i, 1).toLocaleDateString("en-US", { month: "short" }),
      count,
      color: "var(--brand)",
    }));
  }, [scoped]);

  const forecast = useMemo(() => {
    if (!scoped.length) return null;
    const now = new Date();
    const first = new Date(Math.min(...scoped.map((f) => new Date(f.created_at).getTime())));
    const months: { key: string; label: string; count: number; projected: boolean }[] = [];
    const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    while (cursor <= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, label: monthShort(key), count: 0, projected: false });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const byKey = new Map<string, number>();
    for (const f of scoped) {
      const k = f.created_at.slice(0, 7);
      byKey.set(k, (byKey.get(k) ?? 0) + 1);
    }
    for (const mth of months) mth.count = byKey.get(mth.key) ?? 0;
    if (months.length < 4) return null;

    const next = [...months].map((m) => ({ ...m }));
    for (let i = 0; i < 3; i++) {
      const last3 = next.slice(-3).map((m) => m.count);
      const pred = Math.round(last3.reduce((a, b) => a + b, 0) / last3.length);
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      next.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: monthShort(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`), count: pred, projected: true });
    }
    const projected = next.filter((m) => m.projected);
    const peak = projected.reduce((a, b) => (b.count > a.count ? b : a), projected[0]);
    return { months: next.slice(-12), peak };
  }, [scoped]);

  // Tooltip plumbing (same as the previous dashboard)
  useEffect(() => {
    const tip = tipEl.current as HTMLDivElement | null;
    if (!tip) return;
    const tipNode = tip;
    function place(x: number, y: number) {
      const r = tipNode.getBoundingClientRect();
      const pad = 16;
      let left = x + pad;
      let top = y + pad;
      if (left + r.width > window.innerWidth - 8) left = x - r.width - pad;
      if (top + r.height > window.innerHeight - 8) top = y - r.height - pad;
      tipNode.style.left = Math.max(8, left) + "px";
      tipNode.style.top = Math.max(8, top) + "px";
    }
    function src(el: Element | null): HTMLElement | null {
      return el && el.closest ? (el.closest("[data-tip]") as HTMLElement | null) : null;
    }
    let _src: Element | null = null;
    function hide() {
      tipNode.classList.remove("on");
      _src = null;
    }
    function show(el: HTMLElement, x: number, y: number) {
      if (_src !== el) {
        tipNode.innerHTML = el.dataset.tip || "";
        _src = el;
      }
      tipNode.classList.add("on");
      place(x, y);
    }
    const onMove = (e: PointerEvent) => {
      const t = src(e.target as Element);
      if (!t) return hide();
      show(t, e.clientX, e.clientY);
    };
    const onDown = (e: PointerEvent) => {
      const t = src(e.target as Element);
      if (t && e.pointerType === "touch") show(t, e.clientX, e.clientY);
      else if (!t) hide();
    };
    const onOut = (e: PointerEvent) => {
      const to = src(e.relatedTarget as Element);
      if (!to) hide();
    };
    const onFocusIn = (e: FocusEvent) => {
      const t = src(e.target as Element);
      if (!t) return;
      show(t, 8, 8);
      const b = t.getBoundingClientRect();
      place(b.left + b.width / 2, b.top + b.height / 2);
    };
    const onFocusOut = () => hide();
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-5">
        <div className="skeleton h-6 w-40 rounded-lg" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const statusBars = byStatus
    .map((s) => ({
      label: STATUS_LABELS[s.key] ?? s.key,
      value: s.count,
      color: STATUS_COLORS[s.key] ?? "var(--brand)",
      href: statusLink(s.key),
    }))
    .sort((a, b) => b.value - a.value);

  const docBars = byDocument
    .slice(0, 8)
    .map((d) => ({
      label: d.name,
      value: d.count,
      color: d.color,
      href: linkable ? `${listBase}?doc=${encodeURIComponent(d.name)}` : undefined,
      tipRows: [
        ["Requests", d.count],
        [`Copies`, d.copies],
        ["Share", Math.round((d.count / Math.max(1, total)) * 100) + "%"],
      ] as [string, unknown][],
    }));

  const revDocBars = revenueByDoc.map((d) => ({
    label: d.name,
    value: Math.round(d.amount),
    color: d.color,
    tipRows: [
      ["Revenue", pesoS(d.amount)],
      ["Share", Math.round((d.amount / Math.max(1, totalRevenue)) * 100) + "%"],
    ] as [string, unknown][],
  }));

  const volTip = (it: { label: string; value: number }) =>
    mk(it.label, [["Requests", it.value], ["Share of period", Math.round((it.value / Math.max(1, periodTotal)) * 100) + "%"]], "var(--brand)");

  return (
    <div className="analytics-root">
      <section className="page-head">
        <div>
          <h1>{scope === "goodmoral" ? "Good Moral Analytics" : "Analytics"}</h1>
          <p>
            {scope === "goodmoral"
              ? "Good Moral Certificate request volume, pipeline and timing."
              : "Request volume, demand, fulfilment time, revenue and busy periods."}
          </p>
        </div>
        <span className="range">All time · {total} request{total === 1 ? "" : "s"}</span>
      </section>

      <section className="kpis" aria-label="Key figures">
        {scope === "full" && (
          <div
            className="card kpi money"
            tabIndex={0}
            data-tip={mk("Revenue", [
              ["GCash / online", pesoS(gcashRevenue)],
              ["Walk-in & other", pesoS(nonGcashRevenue)],
              ["Paid requests", paidFacts.length],
              ["Average per paid request", pesoS(avgPaid)],
            ])}
          >
            <div className="label">GCash revenue</div>
            <div className="value">{pesoS(gcashRevenue)}</div>
            <div className="hint">{paidFacts.length ? `${paidFacts.length} paid requests` : "No verified payments yet"}</div>
          </div>
        )}
        <div
          className="card kpi"
          tabIndex={0}
          data-tip={mk("Total requests", [
            ["Waiting for action", waiting],
            ["In progress / queued", open],
            ["Completed", byStatus.find((s) => s.key === "completed")?.count ?? 0],
            ["Rejected / cancelled", (byStatus.find((s) => s.key === "rejected")?.count ?? 0) + (byStatus.find((s) => s.key === "cancelled")?.count ?? 0)],
          ])}
        >
          <div className="label">Total requests</div>
          <div className="value">{total}</div>
          <div className="hint">{waiting} waiting for action</div>
        </div>
        <div
          className="card kpi"
          tabIndex={0}
          data-tip={releaseStats ? mk("Time to release", [
            ["Average", fmtDays(releaseStats.avg)],
            ["Median", fmtDays(releaseStats.median)],
            ["90th percentile", fmtDays(releaseStats.p90)],
            ["Released requests", releaseStats.n],
          ]) : mk("Time to release", [["Info", "No completed requests yet"]])}
        >
          <div className="label">Avg time to release</div>
          <div className="value">{releaseStats ? fmtDays(releaseStats.avg) : "—"}</div>
          <div className="hint">{readyStats ? `${fmtDays(readyStats.avg)} to become ready` : "No data yet"}</div>
        </div>
        <div
          className="card kpi"
          tabIndex={0}
          data-tip={mk("Last 12 months", [
            ["Requests", periodTotal],
            ...(delta === null ? [] : [["Later vs earlier half", (delta >= 0 ? "+" : "") + delta + "%"]] as [string, unknown][]),
          ])}
        >
          <div className="label">Requests · last 12 {volPeriod === "month" ? "months" : "periods"}</div>
          <div className="value">{delta === null ? periodTotal : (delta >= 0 ? "+" : "") + delta + "%"}</div>
          <div className="hint">{secondHalf} in the later half of the window</div>
        </div>
        <div
          className="card kpi"
          tabIndex={0}
          data-tip={mk("Requesters", [
            ["Students (current)", studentsCount],
            ["Alumni & graduates", alumniCount],
          ])}
        >
          <div className="label">Alumni share</div>
          <div className="value">{Math.round((alumniCount / Math.max(1, total)) * 100)}%</div>
          <div className="hint">{alumniCount} of {total} requests from alumni</div>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Requests over time</h2>
              <p className="sub">Bucketed by {volPeriod} · click a bar to open that period in the requests list</p>
            </div>
            <div className="controls">
              <select value={volPeriod} onChange={(e) => setVolPeriod(e.target.value as "month" | "week" | "day")} aria-label="Bucket by">
                <option value="month">By month</option>
                <option value="week">By week</option>
                <option value="day">By day</option>
              </select>
            </div>
          </div>
          {volume.some((b) => b.count > 0) ? (
            <Columns
              items={volume.map((b, i) => ({
                label: b.label,
                value: b.count,
                href: linkable ? `${listBase}?from=${volumeLinks[i].from}&to=${volumeLinks[i].to}` : undefined,
              }))}
              tip={(it) => volTip(it)}
            />
          ) : (
            <div className="empty">No requests yet.</div>
          )}
          <p className="sub" style={{ marginTop: 10 }}>
            {periodTotal} requests in the window · recent half {delta !== null ? `${delta >= 0 ? "+" : ""}${delta}% vs earlier half` : ""}
          </p>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Status pipeline</h2>
              <p className="sub">Where requests sit right now · click a slice or legend row to see that status</p>
            </div>
          </div>
          {statusBars.some((s) => s.value > 0) ? (
            <Donut
              items={statusBars.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color,
                tipRows: [
                  ["Requests", s.value],
                  ["Share", s.value ? Math.round((s.value / total) * 100) + "%" : "0%"],
                  ...(s.href ? [["Click", "Open in requests list"] as [string, unknown]] : []),
                ],
              }))}
              centerValue={String(total)}
              centerLabel="requests"
              hrefFor={(label) => {
                const hit = statusBars.find((b) => b.label === label);
                return hit?.href;
              }}
            />
          ) : (
            <div className="empty">No requests yet.</div>
          )}
          <h2 style={{ fontSize: "13.5px", marginTop: 22, marginBottom: 10 }}>How long open requests have been waiting</h2>
          {stuckByStatus.length ? (
            <div className="table-wrap" style={{ maxHeight: 220 }}>
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th className="num">Open</th>
                    <th className="num">Avg age</th>
                    <th className="num">Stale &gt; 7d</th>
                  </tr>
                </thead>
                <tbody>
                  {stuckByStatus.map((s) => (
                    <tr key={s.key} className={statusLink(s.key) ? "clickable" : undefined} tabIndex={0} data-tip={mk(s.status, [
                      ["Open requests", s.n],
                      ["Average age", fmtDays(s.avg)],
                      ["Older than 7 days", s.stale],
                      ...(statusLink(s.key) ? [["Click", "Open filtered request list"] as [string, unknown]] : []),
                    ])} onClick={() => {
                      const href = statusLink(s.key);
                      if (href) window.location.href = href;
                    }}>
                      <td>{s.status}</td>
                      <td className="num">{s.n}</td>
                      <td className="num">{fmtDays(s.avg)}</td>
                      <td className="num">{s.stale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">Nothing is waiting right now.</div>
          )}
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Most requested documents</h2>
              <p className="sub">By number of requests · click to open them in the list</p>
            </div>
          </div>
          <BarRows rows={docBars} />
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Fulfilment time</h2>
              <p className="sub">Days from submission to release</p>
            </div>
          </div>
          <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
            {["Average", "Median", "p90"].map((k) => {
              const v = k === "Average" ? releaseStats?.avg : k === "Median" ? releaseStats?.median : releaseStats?.p90;
              return (
                <div key={k} className="card" style={{ padding: "12px 14px" }}>
                  <div className="label" style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{k}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{releaseStats ? fmtDays(v ?? 0) : "—"}</div>
                </div>
              );
            })}
          </div>
          <BarRows rows={releaseBins} unit={`${releaseStats?.n ?? 0} released`} />
          <p className="sub" style={{ marginTop: 10 }}>
            Median time to <em>ready for pickup</em>: {readyStats ? fmtDays(readyStats.median) : "—"}
          </p>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Who is requesting</h2>
              <p className="sub">Students vs alumni, then by course</p>
            </div>
          </div>
          <div className="donut-wrap" style={{ gridTemplateColumns: "180px 1fr" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              {[
                { label: "Students", value: studentsCount, color: "var(--brand)" },
                { label: "Alumni / graduated", value: alumniCount, color: "var(--completed)" },
              ].map((x) => (
                <div key={x.label} className="bar-row" data-tip={mk(x.label, [
                  ["Requests", x.value],
                  ["Share", Math.round((x.value / Math.max(1, total)) * 100) + "%"],
                ], x.color)} tabIndex={0}>
                  <span>{x.label}</span>
                  <div className="track">
                    <div className="fill" style={{ width: `${(x.value / Math.max(1, total)) * 100}%`, background: x.color }} />
                  </div>
                  <span className="n">{x.value}</span>
                </div>
              ))}
            </div>
            <div>
              <h2 style={{ fontSize: "13.5px", marginBottom: 8 }}>Top courses</h2>
              <div className="table-wrap" style={{ maxHeight: 260 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th className="num">Requests</th>
                      <th className="num">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseTop.map((c) => (
                      <tr
                        key={c.name}
                        className={linkable ? "clickable" : undefined}
                        data-tip={mk(c.name, [
                          ["Requests", c.count],
                          ["Share", Math.round((c.count / Math.max(1, total)) * 100) + "%"],
                          ...(linkable ? [["Click", "Open filtered request list"] as [string, unknown]] : []),
                        ], c.color)}
                        tabIndex={0}
                        onClick={() => {
                          if (linkable) window.location.href = `${listBase}?course=${encodeURIComponent(c.name)}`;
                        }}
                      >
                        <td>{c.name}</td>
                        <td className="num">{c.count}</td>
                        <td className="num">{Math.round((c.count / Math.max(1, total)) * 100)}%</td>
                      </tr>
                    ))}
                    {!courseTop.length && (
                      <tr><td colSpan={3} className="empty">No course data.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <h2 style={{ fontSize: "13.5px", marginBottom: 8, marginTop: 22 }}>By year level</h2>
          {yearTop.length ? (
            <BarRows
              rows={yearTop.map((y, i) => ({
                label: y.name,
                value: y.count,
                color: ["#0b3d91", "#1565c0", "#42a5f5", "#1e88e5", "#90caf9", "#5c8fd6"][i % 6],
                tipRows: [
                  ["Year level", y.name],
                  ["Requests", y.count],
                  ["Share", Math.round((y.count / Math.max(1, total)) * 100) + "%"],
                ],
              }))}
            />
          ) : (
            <div className="empty">No year-level data.</div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Seasonality</h2>
              <p className="sub">Requests by month-of-year (all years) — spot enrollment / graduation peaks</p>
            </div>
          </div>
          {seasonality.some((s) => s.count > 0) ? (
            <Columns items={seasonality.map((s) => ({ label: s.label, value: s.count }))} tip={(it) => mk(it.label, [
              ["Requests", it.value],
              ["Peak month share", Math.round((it.value / Math.max(1, seasonality.reduce((a, b) => a + b.count, 0))) * 100) + "%"],
            ], "var(--brand)")} />
          ) : (
            <div className="empty">No requests yet.</div>
          )}

          {scope === "full" && forecast && (
            <>
              <h2 style={{ fontSize: "13.5px", marginTop: 24, marginBottom: 8 }}>
                Projected load — next 3 months
                {forecast.peak && (
                  <span className="pill" style={{ marginLeft: 8 }}>
                    Peak: {forecast.peak.label} (~{forecast.peak.count})
                  </span>
                )}
              </h2>
              <BarRows
                rows={forecast.months.slice(-12).map((m) => ({
                  label: m.label + (m.projected ? "*" : ""),
                  value: m.count,
                  color: m.projected ? "var(--pending)" : "var(--brand)",
                  tipRows: [
                    ["Month", m.key],
                    ["Requests", m.count],
                    ...(m.projected ? [["Forecast", "3-month moving average"] as [string, unknown]] : []),
                  ],
                }))}
              />
              <p className="sub" style={{ marginTop: 8 }}>* = forecast from a 3-month moving average.</p>
            </>
          )}
        </div>
      </section>

      {scope === "full" && (
        <section className="grid-2 wide-left">
          <div className="card">
            <div className="card-head">
              <div>
                <h2>Revenue</h2>
                <div className="rev-total">{pesoS(totalRevenue)}</div>
                <p className="sub">{paidFacts.length} paid request{paidFacts.length === 1 ? "" : "s"}</p>
              </div>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  const head = ["Document", "Amount"];
                  const csv = [head, ...revenueByDoc.map((d) => [d.name, d.amount])]
                    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
                    .join("\n");
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                  a.download = "revenue-by-document.csv";
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              >
                Export CSV
              </button>
            </div>
            {totalRevenue > 0 && (
              <Donut
                items={[
                  { label: "GCash / online", value: Math.round(gcashRevenue), color: "#00875a" },
                  { label: "Walk-in & other", value: Math.round(nonGcashRevenue), color: "#22c55e" },
                ]}
                centerValue={pesoS(totalRevenue)}
                centerLabel="all time"
              />
            )}
            <BarRows rows={revDocBars} unit="revenue" />
            <p className="sub" style={{ marginTop: 10 }}>
              GCash / online: {pesoS(gcashRevenue)} · walk-in & other: {pesoS(nonGcashRevenue)}
            </p>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h2>Revenue by month</h2>
                <p className="sub">Verified payments · last 12 months</p>
              </div>
            </div>
            {revenueByMonth.some((m) => m.revenue > 0) ? (
              <Columns
                green
                items={revenueByMonth.map((m) => ({ label: m.short, value: Math.round(m.revenue) }))}
                fmt={(v) => (v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k" : String(v))}
                tip={(it) => mk(it.label, [["Revenue", pesoS(it.value)], ["Share", Math.round((it.value / Math.max(1, totalRevenue)) * 100) + "%"]], "var(--money)")}
              />
            ) : (
              <div className="empty">No verified payments yet.</div>
            )}
          </div>
        </section>
      )}

      <div className="tip" ref={tipEl} role="tooltip" />
    </div>
  );
}