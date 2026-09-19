"use client";

import { Fragment, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, Receipt, X } from "lucide-react";

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

  const paidDate = data.paidAt ? new Date(data.paidAt) : new Date();
  const paidLabel = paidDate.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });

  const fields: [string, string][] = [
    ["Name", data.fullName],
    ["ID", data.studentNumber || "—"],
    ["Program", data.course || "—"],
    ["Year", data.yearLevel || "—"],
    ["A.Y.", data.schoolYear || "—"],
    ["Amount", `Php ${data.amount.toFixed(2)}`],
  ];

  const modal = (
    <div className="print-only fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm print:static print:place-items-start print:overflow-visible print:bg-white print:p-0 print:backdrop-blur-none">
      <div className="w-full max-w-[520px] rounded-2xl bg-white p-5 shadow-2xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <div className="flex items-start justify-between gap-3 print:hidden">
          <h2 className="text-lg font-semibold text-slate-900">STAB (student copy)</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="-mr-1.5 -mt-1.5 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 mt-1.5 text-[13.5px] text-slate-500 print:hidden">
          This installment · {paidLabel}. Print a copy — not for official signature.
        </p>

        <div className="mb-4 rounded-xl border border-slate-200 p-3 print:m-0 print:rounded-none print:border-0 print:p-0">
          <div className="border-2 border-slate-900 bg-white px-4 pb-2 pt-3.5">
            <div className="mb-3 flex items-center justify-between gap-3 border-b-2 border-slate-900 pb-2">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/rmclogo.jpg" alt="Regis Marie College" className="h-[34px] w-auto" />
                <span className="text-[13px] font-extrabold uppercase italic leading-none tracking-[0.02em] text-[#0d47a1]">
                  Regis Marie College
                </span>
              </div>
              <div className="text-[11.5px] font-bold uppercase tracking-[0.02em] text-slate-900">
                Office of the Treasury
              </div>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-px text-[13px] text-slate-900">
              {fields.map(([k, v]) => (
                <Fragment key={k}>
                  <dt className="font-bold uppercase">{k}</dt>
                  <dd className="m-0">{v}</dd>
                </Fragment>
              ))}
            </dl>

            <div className="mt-3 border-t-2 border-slate-900 pt-1.5 text-right text-[10px] text-slate-500">
              Student copy · not for official signature
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="no-print mb-2.5 flex h-11 w-full items-center justify-center rounded-[10px] border border-slate-200 bg-white text-[15px] font-semibold text-slate-900 transition-colors hover:bg-slate-50 print:hidden"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#0b0b0f] bg-[#0b0b0f] text-[15px] font-semibold text-white transition-colors hover:bg-[#26262e] print:hidden"
        >
          <Printer className="h-[18px] w-[18px]" />
          Print
        </button>
      </div>
    </div>
  );

  return <>{typeof document !== "undefined" && createPortal(modal, document.body)}</>;
}