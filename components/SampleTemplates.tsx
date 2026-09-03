"use client";

import { useState } from "react";
import { FileText, X } from "lucide-react";
import Image from "next/image";

type SampleTemplateProps = {
  docName: string;
  docDescription: string | null;
};

export default function SampleTemplates({ docName, docDescription }: SampleTemplateProps) {
  const [open, setOpen] = useState(false);

  function renderBody(doc: string) {
    switch (doc) {
      case "Good Moral Certificate":
        return (
          <div className="space-y-1 text-center">
            <p className="text-sm italic text-slate-500">To Whom It May Concern:</p>
            <p className="text-sm text-slate-700">
              This is to certify that <span className="font-semibold">[Student Name]</span> of Regis
              Marie College has maintained good moral character throughout their stay at the institution.
            </p>
            <p className="text-sm text-slate-700">
              No derogatory or disciplinary record has been found against the said student.
            </p>
          </div>
        );
      case "Certificate of Enrollment":
        return (
          <div className="space-y-1 text-center">
            <p className="text-sm italic text-slate-500">To Whom It May Concern:</p>
            <p className="text-sm text-slate-700">
              This is to certify that <span className="font-semibold">[Student Name]</span> is
              presently enrolled at Regis Marie College for the academic year{" "}
              <span className="font-semibold">[Academic Year]</span>.
            </p>
            <p className="text-sm text-slate-700">Course: <span className="font-semibold">[Course]</span></p>
          </div>
        );
      case "Transcript of Records":
        return (
          <div className="space-y-1 text-center">
            <p className="text-sm italic text-slate-500">Official Transcript of Records</p>
            <table className="mx-auto w-full max-w-md border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="p-1 text-left">Year/Term</th>
                  <th className="p-1 text-left">Subject</th>
                  <th className="p-1">Units</th>
                  <th className="p-1">Grade</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-1">1st Year</td><td className="p-1">[Subject]</td><td className="p-1 text-center">3</td><td className="p-1 text-center">[1.00]</td></tr>
                <tr><td className="p-1">1st Year</td><td className="p-1">[Subject]</td><td className="p-1 text-center">3</td><td className="p-1 text-center">[1.25]</td></tr>
              </tbody>
            </table>
            <p className="text-[10px] text-slate-400">Fee: ₱500.00 per page</p>
          </div>
        );
      case "Certified True Copy - COR":
        return (
          <div className="space-y-1 text-center">
            <p className="text-sm italic text-slate-500">Certificate of Registration (Certified True Copy)</p>
            <p className="text-sm text-slate-700">
              A certified true copy of the student&apos;s Certificate of Registration for a given term,
              bearing the registrar&apos;s dry seal and signature.
            </p>
          </div>
        );
      case "Certified True Copy - Copy of Grades":
        return (
          <div className="space-y-1 text-center">
            <p className="text-sm italic text-slate-500">Certified True Copy of Grades</p>
            <p className="text-sm text-slate-700">
              A certified true copy of the student&apos;s grades for a specified term, sealed by the registrar.
            </p>
          </div>
        );
      case "2nd Copy of Copy of Grades":
        return (
          <div className="space-y-1 text-center">
            <p className="text-sm italic text-slate-500">2nd Copy of Copy of Grades</p>
            <p className="text-sm text-slate-700">
              A second copy of the student&apos;s grades document.
            </p>
          </div>
        );
      case "Diploma":
        return (
          <div className="space-y-1 text-center">
            <p className="text-sm italic text-slate-500">Diploma</p>
            <p className="text-sm text-slate-700">
              Official diploma certifying completion of requirements for the degree, subject to office clearance.
            </p>
          </div>
        );
      default:
        return (
          <p className="text-sm text-slate-700">
            Official document issued by the Registrar&apos;s Office of Regis Marie College.
          </p>
        );
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="ml-1 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:underline"
      >
        <FileText className="h-3.5 w-3.5" />
        View Sample
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-brand-900">Sample — {docName}</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {docDescription && (
              <p className="text-sm text-slate-500">{docDescription}</p>
            )}

            <div className="rounded-lg border-2 border-double border-slate-700 bg-white p-6">
              <div className="mb-4 flex items-center justify-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white">
                  <Image src="/logo.png" alt="Regis Marie College" width={48} height={48} />
                </div>
                <div>
                  <p className="text-lg font-bold uppercase tracking-widest text-slate-900">
                    Regis Marie College
                  </p>
                  <p className="text-center text-[10px] text-slate-500">
                    Registrar&apos;s Office
                  </p>
                </div>
              </div>
              <hr className="mb-4 border-slate-300" />
              {renderBody(docName)}
              <hr className="mt-4 border-slate-300" />
              <div className="mt-4 flex items-end justify-between text-xs text-slate-500">
                <div>
                  <p>Issued on: <span className="font-medium">[MM/DD/YYYY]</span></p>
                  <p>Tracking: <span className="font-mono">[RM-XXXXXXXX]</span></p>
                </div>
                <div className="text-center">
                  <div className="mx-auto mt-8 border-t border-slate-400 px-4 pt-1">
                    <p className="italic">Signature over Printed Name</p>
                    <p>Registrar</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-slate-400">
              This is a sample layout. The final printed document may differ.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
