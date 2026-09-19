"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import "./analytics.css";

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

type Pay = {
  date: string;
  receipt: string;
  requestor: string;
  document: string;
  method: string;
  tracking: string;
  amount: number;
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

const pesoS = (n: number) =>
  "₱" +
  Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const esc = (s: unknown) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]);

const niceMax = (v: number) => {
  const x = v || 1;
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  return Math.ceil(x / p / (x / p > 5 ? 2 : 1)) * p * (x / p > 5 ? 2 : 1);
};

const monthLabel = (k: string) => {
  const d = new Date(k + "-28T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short" }) + " " + String(d.getFullYear()).slice(2);
};

const monthShort = (k: string) => new Date(k + "-28T12:00:00").toLocaleDateString("en-US", { month: "short" });

const fmtDate = (iso: string) => {
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  const y = iso.slice(0, 4);
  return `${m}/${d}/${y}`;
};

const mk = (title: string, rows: [string, unknown][], color?: string) =>
  `<b>${color ? `<i class="sw" style="background:${color}"></i>` : ""}${esc(title)}</b>` +
  rows.map(([k, v]) => `<div class="row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join("");

function arc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(r1, a0);
  const [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1);
  const [x3, y3] = p(r0, a0);
  return `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`;
}

function Columns({
  items,
  green = false,
  fmt = (v: number) => String(v),
  tip,
}: {
  items: { label: string; value: number }[];
  green?: boolean;
  fmt?: (v: number) => string;
  tip?: (item: { label: string; value: number }, idx: number, arr: { label: string; value: number }[]) => string | undefined;
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
        {items.map((it, idx) => (
          <div
            key={`${it.label}-${idx}`}
            className={`col${green ? " green" : ""}`}
            tabIndex={0}
            data-tip={tip ? tip(it, idx, items) : undefined}
          >
            <span className="v">{fmt(it.value)}</span>
            <div className="rect" style={{ height: `${(it.value / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="xlabels">
        {items.map((it, idx) => (
          <span key={idx}>{it.label}</span>
        ))}
      </div>
    </div>
  );
}export default function AnalyticsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [qField, setQField] = useState<SearchField>("all");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [donutHot, setDonutHot] = useState<string | null>(null);
  const [period, setPeriod] = useState<"month" | "day" | "year">("month");
  const [periodVal, setPeriodVal] = useState("2026-09");

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

  const months = useMemo(() => {
    const m = new Map<string, { requests: number; revenue: number }>();
    for (const r of rows) {
      const k = r.created_at.slice(0, 7);
      const cur = m.get(k) ?? { requests: 0, revenue: 0 };
      cur.requests += 1;
      m.set(k, cur);
    }
    for (const p of verifiedPayments) {
      const k = (p.verified_at ?? p.created_at).slice(0, 7);
      const cur = m.get(k) ?? { requests: 0, revenue: 0 };
      cur.revenue += p.amount || 0;
      m.set(k, cur);
    }
    return [...m.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([k, v]) => ({ label: monthLabel(k), short: monthShort(k), key: k, ...v }));
  }, [rows, verifiedPayments]);

  const days = useMemo(() => {
    const m = new Map<string, { n: number; total: number }>();
    for (const p of verifiedPayments) {
      const d = (p.verified_at ?? p.created_at).slice(0, 10);
      const cur = m.get(d) ?? { n: 0, total: 0 };
      cur.n += 1;
      cur.total += p.amount || 0;
      m.set(d, cur);
    }
    return [...m.entries()]
      .map(([date, v]) => ({ date: fmtDate(date), total: v.total, n: v.n }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [verifiedPayments]);

  const payList = useMemo<Pay[]>(() => {
    const seen = new Set<number>();
    return verifiedPayments
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .map((p) => ({
        date: fmtDate((p.verified_at ?? p.created_at).slice(0, 10)),
        receipt: p.reference_number ?? "",
        requestor: p.requests?.profiles?.full_name ?? "",
        document: p.requests?.documents?.name ?? "",
        method: p.payment_method ?? "",
        tracking: p.requests?.tracking_code ?? "",
        amount: p.amount || 0,
      }));
  }, [verifiedPayments]);

  const tipEl = useRef<HTMLDivElement>(null);

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
      if (!t) {
        hide();
        return;
      }
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

  const totalReq = statusData.reduce((s, x) => s + x.count, 0);
  const totalRev = verifiedPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const donutTotal = documentData.reduce((s, d) => s + d.count, 0) || 1;
  const dayCount = days.reduce((s, d) => s + d.n, 0);
  const payN = payList.length || 1;
  const avgPay = totalRev / payN;

  const selectedFilter = (p: Pay) => {
    if (selectedDoc && p.document !== selectedDoc) return false;
    return true;
  };
  const filtered = payList.filter((p) => {
    if (!selectedFilter(p)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const target = (() => {
      switch (qField) {
        case "receipt":
          return p.receipt;
        case "requestor":
          return p.requestor;
        case "document":
          return p.document;
        case "method":
          return p.method;
        case "tracking":
          return p.tracking;
        default:
          return `${p.date} ${p.receipt} ${p.requestor} ${p.document} ${p.method} ${p.tracking}`;
      }
    })();
    return target.toLowerCase().includes(q);
  });
  const shownTotal = filtered.reduce((s, p) => s + p.amount, 0);

  const daysTotal = days.reduce((s, d) => s + d.total, 0);
  const revSub = `${dayCount} payments in this period`;

  const numFmt = (v: number) => (v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k" : String(v));

  const statusBars = statusData
    .map((s) => ({
      label: STATUS_LABELS[s.status] ?? s.status,
      n: s.count,
      color: STATUS_COLORS[s.status] ?? "var(--brand)",
    }))
    .sort((a, b) => b.n - a.n);

  const top = [...documentData].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="analytics-root">
      <section className="page-head">
        <div>
          <h1>Analytics</h1>
          <p>Request volume, demand and revenue at a glance.</p>
        </div>
        <span className="range">All time</span>
      </section>

      <section className="kpis" aria-label="Key figures">
        <div
          className="card kpi money"
          tabIndex={0}
          data-tip={mk("Revenue", [
            ["Latest month (" + (months[months.length - 1]?.label ?? String(new Date().getFullYear())) + ")", pesoS(months[months.length - 1]?.revenue ?? 0)],
            ["Payments in period", payList.length],
            ["Average per payment", pesoS(avgPay)],
          ])}
        >
          <div className="label">Total revenue</div>
          <div className="value">{pesoS(totalRev)}</div>
          <div className="hint">{payList.length ? "From paid requests" : ""}</div>
        </div>
        <div
          className="card kpi"
          tabIndex={0}
          data-tip={mk("Requests by status", statusBars.map((s) => [s.label, s.n]))}
        >
          <div className="label">Total requests</div>
          <div className="value">{totalReq}</div>
          <div className="hint">{pendingCount} waiting for action</div>
        </div>
        <div
          className="card kpi"
          tabIndex={0}
          data-tip={mk("Most requested", top ? [[top.name, top.count + " requests"], ["Share of all", Math.round((top.count / donutTotal) * 100) + "%"]] : [["Info", "No requests yet"]])}
        >
          <div className="label">Document types</div>
          <div className="value">{documentData.length}</div>
          <div className="hint">In demand</div>
        </div>
        <div
          className="card kpi"
          tabIndex={0}
          data-tip={mk("Copies issued", [
            ["Total copies", totalCopies],
            ["Total requests", totalReq],
            ["Average per request", (totalCopies / Math.max(1, totalReq)).toFixed(1)],
          ])}
        >
          <div className="label">Total copies</div>
          <div className="value">{totalCopies}</div>
          <div className="hint">Avg. {(totalCopies / Math.max(1, totalReq)).toFixed(1)} per request</div>
        </div>
      </section>

      <section className="card filters" aria-label="Search">
        <div className="field">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Search receipts, requestors, tracking codes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          value={qField}
          onChange={(e) => setQField(e.target.value as SearchField)}
          aria-label="Search field"
        >
          {SEARCH_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <button className={`chip${selectedDoc ? " on" : ""}`} type="button" onClick={() => setSelectedDoc(null)}>
          {selectedDoc} ✕
        </button>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Requests by status</h2>
              <p className="sub">Where requests are in the workflow</p>
            </div>
          </div>
          <div className="bars">
            {statusBars.length ? (
              statusBars.map((s) => (
                <div
                  key={s.label}
                  className="bar-row"
                  tabIndex={0}
                  data-tip={mk(s.label, [
                    ["Requests", s.n],
                    ["Share of all", Math.round((s.n / totalReq) * 100) + "%"],
                  ], s.color)}
                >
                  <span>{s.label}</span>
                  <div className="track">
                    <div className="fill" style={{ width: `${(s.n / Math.max(1, statusBars[0].n)) * 100}%`, background: s.color }} />
                  </div>
                  <span className="n">{s.n}</span>
                </div>
              ))
            ) : (
              <div className="empty">No requests yet.</div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Requests by month</h2>
              <p className="sub">Volume over time</p>
            </div>
          </div>
          {months.length ? (
            <Columns
              items={months.map((m) => ({ label: m.label, value: m.requests }))}
              tip={(it, idx, arr) => {
                const prev = idx ? arr[idx - 1] : null;
                const rows: [string, unknown][] = [
                  ["Requests", it.value],
                  ["Share of all", Math.round((it.value / Math.max(1, totalReq)) * 100) + "%"],
                ];
                if (prev) rows.push(["vs " + prev.label, it.value >= prev.value ? "+" + (it.value - prev.value) : String(it.value - prev.value)]);
                return mk(it.label, rows, "var(--brand)");
              }}
            />
          ) : (
            <div className="empty">No requests yet.</div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Requests by document type</h2>
            <p className="sub">Select a slice or a row to filter the payments report below.</p>
          </div>
        </div>
        {documentData.length ? (
          <div className="donut-wrap">
            <div className={`donut${selectedDoc ? " filtering" : ""}`}>
              <svg viewBox="0 0 260 260">
                {(() => {
                  let a = 0;
                  const gap = 0.02;
                  return documentData.map((d) => {
                    const span = (d.count / donutTotal) * Math.PI * 2;
                    const path = arc(130, 130, 78, 120, a + gap / 2, a + span - gap / 2);
                    a += span;
                    const cls = (selectedDoc === d.name ? " sel" : "") + (donutHot === d.name ? " hl" : "");
                    const rank = 1 + documentData.filter((x) => x.count > d.count).length;
                    return (
                      <path
                        key={d.name}
                        className={cls}
                        d={path}
                        fill={d.color}
                        data-doc={d.name}
                        tabIndex={0}
                        role="button"
                        aria-label={`${d.name}: ${d.count}`}
                        data-tip={mk(d.name, [
                          ["Requests", d.count],
                          ["Share", Math.round((d.count / donutTotal) * 100) + "%"],
                          ["Popularity", "#" + rank + " of " + documentData.length],
                          ["Click to", "filter payments"],
                        ], d.color)}
                        onMouseEnter={() => setDonutHot(d.name)}
                        onMouseMove={() => setDonutHot(d.name)}
                        onMouseLeave={() => setDonutHot(null)}
                        onClick={() => setSelectedDoc((prev) => (prev === d.name ? null : d.name))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedDoc((prev) => (prev === d.name ? null : d.name));
                          }
                        }}
                      />
                    );
                  });
                })()}
              </svg>
              <div className="center">
                <b>
                  {(() => {
                    const hot = donutHot ? documentData.find((d) => d.name === donutHot) : null;
                    const sel = selectedDoc ? documentData.find((d) => d.name === selectedDoc) : null;
                    return (hot ?? sel)?.count ?? donutTotal;
                  })()}
                </b>
                <span>
                  {(() => {
                    const hot = donutHot ? documentData.find((d) => d.name === donutHot) : null;
                    const sel = selectedDoc ? documentData.find((d) => d.name === selectedDoc) : null;
                    if (hot) return Math.round((hot.count / donutTotal) * 100) + "% of requests";
                    if (sel) return "selected";
                    return "requests";
                  })()}
                </span>
              </div>
            </div>
            <ul className="legend">
              {documentData.map((d) => (
                <li key={d.name}>
                  <button
                    type="button"
                    data-doc={d.name}
                    className={`${selectedDoc === d.name ? "sel" : ""}`}
                    onMouseMove={() => setDonutHot(d.name)}
                    onMouseLeave={() => setDonutHot(null)}
                    onClick={() => setSelectedDoc((prev) => (prev === d.name ? null : d.name))}
                  >
                    <span className="dot" style={{ background: d.color }} />
                    <span>{d.name}</span>
                    <span className="cnt">{d.count}</span>
                    <span className="pct">{Math.round((d.count / donutTotal) * 100)}%</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="empty">No requests yet.</div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Revenue</h2>
            <div className="rev-total">{pesoS(daysTotal)}</div>
            <p className="sub">{revSub}</p>
          </div>
          <div className="controls">
            <select value={period} onChange={(e) => setPeriod(e.target.value as "month" | "day" | "year")} aria-label="Period">
              <option value="month">By month</option>
              <option value="day">By day</option>
              <option value="year">By year</option>
            </select>
            <input
              type={period === "month" ? "month" : period === "day" ? "date" : "number"}
              min={period === "year" ? 2020 : undefined}
              max={period === "year" ? 2100 : undefined}
              value={periodVal}
              onChange={(e) => setPeriodVal(e.target.value)}
              aria-label="Period value"
            />
          </div>
        </div>
        <div className="grid-2 wide-left">
          <div>
            <h2 style={{ fontSize: "13.5px", marginBottom: "12px" }}>
              Revenue by month ({period === "year" ? periodVal : periodVal.slice(0, 4)})
            </h2>
            {months.length ? (
              <Columns
                green
                items={months.map((m) => ({ label: m.short, value: m.revenue }))}
                fmt={numFmt}
                tip={(it) =>
                  mk(it.label, [
                    ["Revenue", pesoS(it.value)],
                    ["Share of year", Math.round((it.value / Math.max(1, daysTotal)) * 100) + "%"],
                  ], "var(--money)")
                }
              />
            ) : (
              <div className="empty">No verified payments yet.</div>
            )}
          </div>
          <div>
            <h2 style={{ fontSize: "13.5px", marginBottom: "12px" }}>Revenue by day</h2>
            <div className="table-wrap" style={{ maxHeight: "300px" }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="num">Payments</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {days.length ? (
                    days.map((d) => (
                      <tr key={d.date} tabIndex={0} data-tip={mk(d.date, [
                        ["Payments", d.n],
                        ["Total", pesoS(d.total)],
                        ["Avg per payment", pesoS(d.total / Math.max(1, d.n))],
                        ["Share of period", Math.round((d.total / Math.max(1, daysTotal)) * 100) + "%"],
                      ])}>
                        <td>{d.date}</td>
                        <td className="num">{d.n}</td>
                        <td className="num money-text">{pesoS(d.total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="empty">No verified payments yet.</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className="num">{dayCount}</td>
                    <td className="num">{pesoS(daysTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Payments report</h2>
            <p className="sub">
              {filtered.length} of {payList.length} receipts shown
            </p>
          </div>
          <button
            className="btn"
            type="button"
            onClick={() => {
              const head = ["Date", "Receipt No.", "Requestor", "Document", "Method", "Tracking", "Amount"];
              const csv = [head, ...filtered.map((p) => [p.date, p.receipt, p.requestor, p.document, p.method, p.tracking, p.amount])]
                .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
                .join("\n");
              const a = document.createElement("a");
              a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
              a.download = "payments-report.csv";
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            Export CSV
          </button>
        </div>
        <div className="table-wrap" style={{ maxHeight: "420px" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Receipt no.</th>
                <th>Requestor</th>
                <th>Document</th>
                <th>Method</th>
                <th>Tracking</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((p) => (
                  <tr key={p.receipt} tabIndex={0} data-tip={mk(p.receipt, [
                    ["Requestor", p.requestor],
                    ["Document", p.document],
                    ["Amount", pesoS(p.amount)],
                    ["Share of shown", Math.round((p.amount / Math.max(1, shownTotal)) * 100) + "%"],
                  ])}>
                    <td>{p.date}</td>
                    <td className="mono code">{p.receipt}</td>
                    <td>{p.requestor}</td>
                    <td>{p.document}</td>
                    <td>
                      <span className="pill">{p.method}</span>
                    </td>
                    <td className="mono">{p.tracking}</td>
                    <td className="num money-text">{pesoS(p.amount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty">
                    No payments match your search. Clear the filters to see all receipts.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6}>Total</td>
                <td className="num">{pesoS(shownTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="tip" ref={tipEl} role="tooltip" />
    </div>
  );
}