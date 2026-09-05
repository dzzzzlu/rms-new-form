"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";

type PrintDoc = {
  docName: string;
  trackingCode: string;
  fullName: string;
  studentNumber: string | null;
  course: string | null;
  copies: number;
  status: string;
  classList?: string | null;
  issuedAt?: string;
};

export default function PrintDocument({ doc }: { doc: PrintDoc }) {
  const [open, setOpen] = useState(false);

  const issuedDate = doc.issuedAt
    ? new Date(doc.issuedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  function doPrint() {
    window.print();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline flex items-center gap-2">
        <Printer className="h-4 w-4" />
        Print Paper
      </button>
    );
  }

  const certificate = (
    <div className="print-only">
      <div className="print-area rounded-lg border border-slate-200 p-10">
        <div className="border-2 border-double border-slate-700 p-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Regis Marie College" className="h-16 w-16 rounded-full" />
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-widest text-slate-900">
                Regis Marie College
              </h1>
              <p className="text-xs text-slate-600">
                Document Request System · Official Document
              </p>
            </div>
          </div>

          <div className="my-8 border-t border-b border-slate-300 py-8">
            <p className="mb-6 text-4xl font-serif font-bold uppercase tracking-wide text-slate-900">
              {doc.docName}
            </p>
            <p className="mb-1 text-sm text-slate-500">This is to certify that</p>
            <p className="my-1 text-2xl font-semibold uppercase text-brand-900">
              {doc.fullName}
            </p>
            <div className="mx-auto mt-3 flex max-w-md items-center justify-center gap-4 text-sm text-slate-700">
              {doc.studentNumber && (
                <span>Student No: <strong>{doc.studentNumber}</strong></span>
              )}
              {doc.course && <span>Course: <strong>{doc.course}</strong></span>}
            </div>
            {doc.status === "Completed" && (
              <p className="mt-4 text-sm text-emerald-700">
                Status: <strong>COMPLETED</strong>
              </p>
            )}
          </div>

          {doc.classList && (
            <div className="mb-6 text-left">
              <p className="mb-2 font-semibold text-slate-800">Class List:</p>
              <pre className="whitespace-pre-line text-sm text-slate-700">{doc.classList}</pre>
            </div>
          )}

          <p className="mb-10 text-sm text-slate-600">
            This official document is issued by the Registrar&apos;s Office of Regis Marie College.
          </p>

          <div className="flex items-end justify-between text-sm">
            <div className="text-left">
              <p className="font-semibold text-slate-800">Issued on</p>
              <p className="text-slate-600">{issuedDate}</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-800">Tracking Code</p>
              <p className="font-mono text-slate-600">{doc.trackingCode}</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-800">Copies</p>
              <p className="text-slate-600">{doc.copies}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-800">Registrar</p>
              <div className="mt-16 border-t border-slate-500 px-4 pt-1">
                <p className="text-xs italic text-slate-500">Signature over Printed Name</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={doPrint}
        className="no-print btn-primary flex items-center gap-2"
      >
        <Printer className="h-4 w-4" />
        Print
      </button>
      <button
        onClick={() => setOpen(false)}
        className="no-print btn-outline ml-2"
      >
        Close Preview
      </button>

      {typeof document !== "undefined" && createPortal(certificate, document.body)}
    </>
  );
}
