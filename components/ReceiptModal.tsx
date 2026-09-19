"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Printer, Receipt, X } from "lucide-react";

export type ReceiptData = {
  fullName: string;
  course: string | null;
  yearLevel: string | null;
  schoolYear: string | null;
  documentName: string;
  trackingCode: string;
  copies: number;
  amount: number;
  referenceNumber: string;
  paidAt: string | null;
  paymentMethod: "gcash" | "walk_in";
};

function schoolYear(date: Date): string {
  return date.getMonth() >= 5
    ? `${date.getFullYear()}-${date.getFullYear() + 1}`
    : `${date.getFullYear() - 1}-${date.getFullYear()}`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-1.5 text-sm">
      <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="min-w-0 border-b border-dotted border-slate-400 text-right font-medium text-slate-900">
        {value}
      </span>
    </div>
  );
}

function ReceiptPaper({ data }: { data: ReceiptData }) {
  const paidDate = data.paidAt ? new Date(data.paidAt) : new Date();
  const paidLabel = data.paidAt
    ? paidDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="print-area overflow-hidden border border-slate-300">
      <div className="flex items-center justify-between gap-3 bg-brand-900 px-5 py-3 text-white">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rmclogo.jpg" alt="Regis Marie College" className="h-10 w-10 rounded-md bg-white" />
          <div>
            <p className="text-sm font-bold uppercase tracking-wide">Regis Marie College</p>
            <p className="text-[11px] text-white/80">Document Request System</p>
          </div>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest">
          Student Copy
        </span>
      </div>

      <div className="border-y border-brand-900 bg-brand-50 px-5 py-2 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-900">
          Office of the Treasury
        </p>
      </div>

      <div className="space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Receipt No.</p>
            <p className="font-mono text-sm font-semibold text-slate-900">
              {data.referenceNumber || "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Date</p>
            <p className="text-sm font-medium text-slate-900">{paidLabel}</p>
          </div>
          <span className="rounded bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            Paid in Full
          </span>
        </div>

        <div className="divide-y divide-slate-200 border-t border-slate-200 pt-1">
          <Row label="NAME" value={data.fullName} />
          <Row label="PROGRAM" value={data.course || data.yearLevel || "—"} />
          <Row label="YEAR" value={data.yearLevel || "—"} />
          <Row label="A.Y." value={data.schoolYear || schoolYear(paidDate)} />
          <Row label="DOCUMENT" value={data.documentName} />
          <Row label="REQUEST NO." value={<span className="font-mono">{data.trackingCode}</span>} />
          <Row label="PAYMENT" value={data.paymentMethod === "walk_in" ? "Walk-in" : "GCash"} />
          <div className="flex items-center justify-between gap-6 py-2 text-sm">
            <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-500">
              Amount
            </span>
            <span className="text-base font-bold text-brand-900">₱{data.amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-slate-300 px-5 py-3 text-center text-[11px] italic text-slate-500">
        Student copy not for official signature.
      </div>
    </div>
  );
}

export default function ReceiptModal({ data }: { data: ReceiptData }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-outline flex items-center gap-2 text-xs"
      >
        <Receipt className="h-3.5 w-3.5" />
        View Receipt
      </button>
    );
  }

  const modal = (
    <div className="print-only fixed inset-0 z-[100] overflow-y-auto bg-slate-900/50 p-4 md:p-10 print:static print:overflow-visible print:bg-white print:p-0">
      <div className="mx-auto w-full max-w-md space-y-4 print:max-w-none print:space-y-0">
        <div className="mx-auto max-w-md print:max-w-none">
          <ReceiptPaper data={data} />
        </div>
        <div className="no-print sticky bottom-4 flex flex-wrap items-center justify-center gap-3 print:hidden">
          <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </button>
          <button onClick={() => setOpen(false)} className="btn-outline flex items-center gap-2">
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return <>{typeof document !== "undefined" && createPortal(modal, document.body)}</>;
}