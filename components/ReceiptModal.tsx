"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Download, Receipt, X } from "lucide-react";

export type ReceiptData = {
  fullName: string;
  studentNumber: string | null;
  course: string | null;
  yearLevel: string | null;
  schoolYear: string | null;
  documentName: string;
  trackingCode: string;
  amount: number;
  referenceNumber: string;
  paidAt: string | null;
};

function schoolYear(date: Date): string {
  return date.getMonth() >= 5
    ? `${date.getFullYear()}-${date.getFullYear() + 1}`
    : `${date.getFullYear() - 1}-${date.getFullYear()}`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-3 border-b border-dotted border-slate-300 py-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function ReceiptPaper({ data }: { data: ReceiptData }) {
  const paidDate = data.paidAt ? new Date(data.paidAt) : new Date();
  const paidLabel = paidDate.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "NAME", value: data.fullName },
    { label: "STUDENT NO.", value: data.studentNumber || "—" },
    { label: "PROGRAM", value: data.course || "—" },
    { label: "YEAR", value: data.yearLevel || "—" },
    { label: "A.Y.", value: data.schoolYear || schoolYear(paidDate) },
    { label: "DOCUMENT", value: data.documentName },
    { label: "REQ. NO.", value: <span className="font-mono">{data.trackingCode}</span> },
    { label: "AMOUNT", value: <span className="text-base font-bold text-brand-900">₱{data.amount.toFixed(2)}</span> },
  ];

  return (
    <div className="print-area overflow-hidden border border-slate-300 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <p className="text-sm font-bold text-slate-800">STAB (student copy)</p>
        <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          Paid in Full
        </span>
      </div>

      <p className="border-b border-slate-200 bg-slate-50 px-5 py-2 text-[11px] text-slate-500">
        This installment {paidLabel}. Download a copy – not for official signature.
      </p>

      <div className="border-b border-slate-800 px-5 py-2 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-slate-800">
          Office of the Treasury
        </p>
      </div>

      <div className="px-5 py-3">
        {rows.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} />
        ))}
      </div>

      <div className="px-5 pb-4">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">Student signature</p>
        <div className="mt-6 w-56 border-t border-slate-500" />
      </div>

      <div className="border-t border-dashed border-slate-300 px-5 py-2 text-center text-[10px] italic text-slate-500">
        Student copy not for official signature. Receipt No. {data.referenceNumber || "—"}
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
            <Download className="h-4 w-4" />
            Download
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