"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Download, Printer } from "lucide-react";

export type PrintDoc = {
  docName: string;
  trackingCode: string;
  fullName: string;
  studentNumber: string | null;
  course: string | null;
  copies: number;
  status: string;
  classList?: string | null;
  issuedAt?: string;
  contactNumber?: string | null;
  email?: string | null;
};

export type PrintVariant = "student" | "registrar";

const REGISTRAR = "CHRISTIAN V. TABUGA";
const TOR_REGISTRAR = "SHIENA MARIE H. VICTORIANO";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function schoolYear(date: Date): string {
  return date.getMonth() >= 5
    ? `${date.getFullYear()}-${date.getFullYear() + 1}`
    : `${date.getFullYear() - 1}-${date.getFullYear()}`;
}

function blankRows(n: number) {
  return Array.from({ length: n }, (_, i) => (
    <tr key={i} className="h-5">
      <td className="border border-slate-800" />
      <td className="border border-slate-800" />
      <td className="border border-slate-800" />
      <td className="border border-slate-800" />
      <td className="border border-slate-800" />
    </tr>
  ));
}

function blankRowsTor(n: number) {
  return Array.from({ length: n }, (_, i) => (
    <tr key={i} className="h-5">
      <td className="border border-slate-800" />
      <td className="border border-slate-800" />
      <td className="border border-slate-800" />
      <td className="border border-slate-800" />
      <td className="border border-slate-800" />
      <td className="border border-slate-800" />
      <td className="border border-slate-800" />
    </tr>
  ));
}

function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value?: string | null;
  wide?: boolean;
}) {
  return (
    <p className={wide ? "col-span-2" : ""}>
      <span className="font-bold uppercase">{label}:</span>{" "}
      <span className="underline decoration-slate-400 decoration-dotted">{value || ""}</span>
    </p>
  );
}

function genericCertificate(doc: PrintDoc, issuedDateLong: string) {
  return (
    <div className="print-area border-2 border-double border-slate-800 p-8 text-center text-slate-900">
      <div className="mb-4 flex items-center justify-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/rmclogo.jpg" alt="Regis Marie College" className="h-16 w-16 rounded-md" />
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-widest">Regis Marie College</h1>
          <p className="text-xs text-slate-600">Document Request System · Official Document</p>
        </div>
      </div>

      <div className="my-8 border-y border-slate-300 py-8">
        <p className="mb-6 text-4xl font-serif font-bold uppercase tracking-wide">
          {doc.docName}
        </p>
        <p className="mb-1 text-sm text-slate-500">This is to certify that</p>
        <p className="my-1 text-2xl font-semibold text-brand-900">{doc.fullName}</p>
        <div className="mx-auto mt-3 flex max-w-md items-center justify-center gap-4 text-sm">
          {doc.studentNumber && (
            <span>
              Student No: <strong>{doc.studentNumber}</strong>
            </span>
          )}
          {doc.course && (
            <span>
              Course: <strong>{doc.course}</strong>
            </span>
          )}
        </div>
      </div>

      <p className="mb-10 text-sm text-slate-600">
        This official document is issued by the Registrar&apos;s Office of Regis Marie College.
      </p>

      <div className="flex items-end justify-between text-sm">
        <div className="text-left">
          <p className="font-semibold">Issued on</p>
          <p className="text-slate-600">{issuedDateLong}</p>
        </div>
        <div className="text-center">
          <p className="font-semibold">Tracking Code</p>
          <p className="font-mono text-slate-600">{doc.trackingCode}</p>
        </div>
        <div className="text-center">
          <p className="font-semibold">Copies</p>
          <p className="text-slate-600">{doc.copies}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">Registrar</p>
          <div className="mt-16 border-t border-slate-500 px-4 pt-1">
            <p className="text-xs italic text-slate-500">Signature over Printed Name</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function certificate(doc: PrintDoc, variant: PrintVariant) {
  const issuedDate = doc.issuedAt ? new Date(doc.issuedAt) : new Date();

  const issuedDateLong = issuedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const issuedFormal = `${issuedDate.getDate()}${
    ordinal(issuedDate.getDate())
  } day of ${issuedDate.toLocaleDateString("en-US", { month: "long" })}, ${
    issuedDate.getFullYear()
  }`;

  const ay = schoolYear(issuedDate);

  switch (doc.docName) {
    case "Transcript of Records":
      return (
        <div className="print-area border-2 border-double border-slate-800 p-6 text-slate-900">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/rmclogo.jpg" alt="Regis Marie College" className="mx-auto h-14 w-14 rounded-md" />
            <h1 className="text-2xl font-bold uppercase tracking-wide">Regis Marie College</h1>
            <p className="text-[11px]">Sucat, Parañaque City • www.regismariecollege.com • Tel No.: 8671-01-99</p>
            <div className="mx-auto mt-2 w-full border-y border-slate-800 py-1">
              <p className="text-xs font-semibold uppercase tracking-widest">Office of the Registrar</p>
            </div>
            <p className="mt-2 text-lg font-bold uppercase tracking-widest">Official Transcript of Records</p>
          </div>

          <div className="mt-4 border border-slate-800 p-3 text-[11px]">
            <p className="mb-2 text-xs font-bold uppercase underline">Admission Data</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
              <Field label="Student No." value={doc.studentNumber} />
              <Field label="Name" value={doc.fullName} />
              <Field label="Course" value={doc.course} />
              <Field label="Date of Birth" />
              <Field label="Place of Birth" />
              <Field label="Gender" />
              <Field label="Nationality" />
              <Field label="Parent / Guardian" />
              <Field label="Complete Address" wide />
              <Field label="Contact No." value={doc.contactNumber} />
            </div>
          </div>

          <table className="mt-4 w-full border-collapse text-[10px]">
            <thead>
              <tr>
                <th rowSpan={2} className="border border-slate-800 bg-slate-100 p-1">COURSE NUMBER</th>
                <th rowSpan={2} className="border border-slate-800 bg-slate-100 p-1">DESCRIPTIVE TITLE OF THE COURSE</th>
                <th colSpan={3} className="border border-slate-800 bg-slate-100 p-1">GRADES</th>
                <th rowSpan={2} className="border border-slate-800 bg-slate-100 p-1">CREDITS</th>
                <th rowSpan={2} className="border border-slate-800 bg-slate-100 p-1">REMARKS</th>
              </tr>
              <tr>
                <th className="border border-slate-800 bg-slate-100 p-1">RE-EXAM</th>
                <th className="border border-slate-800 bg-slate-100 p-1">FINAL</th>
                <th className="border border-slate-800 bg-slate-100 p-1">COMPLETION</th>
              </tr>
            </thead>
            <tbody>{blankRowsTor(6)}</tbody>
          </table>

          <p className="mt-3 text-[9px] leading-snug text-slate-700">
            GRADING SYSTEM: 1.0 = 98-100; 1.25 = 95-97; 1.5 = 93-94; 1.75 = 90-92; 2.0 = 87-89;
            2.25 = 84-86; 2.5 = 81-83; 2.75 = 79-80; 3.00 = 75-78; 5.0 = 70-74 Below; A =
            Excellent; B = Above Average; C = Passing; D = Dropped; Inc = Incomplete
          </p>
          <p className="mt-2 text-[10px] font-semibold">Not Valid Without Dry Seal</p>

          <div className="mt-10 flex items-end justify-between">
            <p className="text-[10px] text-slate-600">
              Request No.: <span className="font-mono">{doc.trackingCode}</span>
            </p>
            <div className="text-center">
              <p className="text-xs font-semibold">{TOR_REGISTRAR}</p>
              <p className="text-[10px] uppercase">Registrar</p>
            </div>
          </div>
        </div>
      );

    case "Certificate of Enrollment":
      return (
        <div className="print-area border-2 border-double border-slate-800 p-6 text-slate-900">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/rmclogo.jpg" alt="Regis Marie College" className="mx-auto h-14 w-14 rounded-md" />
            <h1 className="text-2xl font-bold uppercase tracking-wide">Regis Marie College</h1>
            <p className="text-[10px]">
              #7072 Dollar Lane St., Villanueva Village, Brgy. San Dionisio, Sucat,
            </p>
            <p className="text-[10px]">Parañaque City, Metro Manila 1700</p>
            <p className="text-[10px]">
              Contact No.: (02) 8671-01-99 • admin@regismarie-college.com •
              www.regismariecollege.com
            </p>
            <div className="mx-auto mt-2 w-full border-y border-slate-800 py-1">
              <p className="text-xs font-semibold uppercase tracking-widest">Office of the Registrar</p>
            </div>
            <p className="mt-2 text-lg font-bold uppercase tracking-widest">Certificate of Enrollment</p>
          </div>

          <p className="mt-5 text-[11px] font-bold">TO WHOM IT MAY CONCERN:</p>
          <p className="mt-2 text-[11px]">Greetings!</p>

          <p className="mt-3 indent-10 text-[11px] leading-relaxed">
            This is to certify that <b>{doc.fullName}</b> is a bona fide student of{" "}
            <b>{doc.course || "_________________"}</b> at Regis Marie College for{" "}
            <b>1ST Term - Trimester</b> School Year <b>{ay}</b>.
          </p>
          <p className="mt-2 indent-10 text-[11px] leading-relaxed">
            He was enrolled in the following subjects for the 1ST Term - Trimester School Year{" "}
            {ay}.
          </p>

          <table className="mt-3 w-full border-collapse text-[10px]">
            <thead>
              <tr>
                <th className="border border-slate-800 bg-slate-100 p-1">NO.</th>
                <th className="border border-slate-800 bg-slate-100 p-1">COURSE CODE</th>
                <th className="border border-slate-800 bg-slate-100 p-1">COURSE TITLE</th>
                <th className="border border-slate-800 bg-slate-100 p-1">UNITS</th>
              </tr>
            </thead>
            <tbody>{blankRows(8)}</tbody>
          </table>
          <p className="mt-1 text-right text-[10px] font-bold">
            TOTAL UNITS ENROLLED: ________
          </p>

          <p className="mt-3 text-[9px] leading-snug text-slate-600">
            GRADING SYSTEM: 1.00 = 98-100; 1.25 = 95-97; 1.50 = 93-94; 1.75 = 90-92;
            2.00 = 87-89; 2.25 = 84-86; 2.50 = 81-83; 2.75 = 79-80; 3.00 = 75-78;
            4.00 = INC; 5.00 = FAILED; DRP = DROPPED
          </p>

          <p className="mt-3 indent-10 text-[11px] leading-relaxed">
            This certification is issued upon the request of <b>{doc.fullName}</b> for whatever
            legal purpose it may serve.
          </p>
          <p className="mt-2 indent-10 text-[11px] leading-relaxed">
            Issued this {issuedFormal} at Regis Marie College, Parañaque City.
          </p>

          <div className="mt-10 flex items-end justify-end">
            <div className="text-center">
              <p className="text-sm font-semibold">{REGISTRAR}</p>
              <p className="text-[11px] uppercase">College Registrar</p>
              <p className="mt-2 text-[9px] italic text-slate-600">Not valid without school seal.</p>
            </div>
          </div>
        </div>
      );

    case "Certified True Copy - COR":
      return (
        <div className="print-area border-2 border-double border-slate-800 p-6 text-slate-900">
          <div className="border-b-2 border-slate-800 pb-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/rmclogo.jpg" alt="Regis Marie College" className="mx-auto h-14 w-14 rounded-md" />
            <h1 className="text-xl font-bold uppercase tracking-wide">Regis Marie College</h1>
            <p className="text-[10px]">7108 LIRE LANE VILLANUEVA VILLAGE PARAÑAQUE CITY</p>
            <p className="text-[10px]">CONTACT NO.: (02) 8671-01-99 / 0939-266-9493</p>
            <p className="text-[10px]">EMAIL ADDRESS: records@regismarie.com</p>
            <p className="mt-1 text-[9px] uppercase tracking-widest">
              Choose Excellence! Choose RMC
            </p>
            <p className="mt-1 text-lg font-bold uppercase tracking-widest">Enrollment Form</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-10 gap-y-1.5 text-[11px]">
            <p>
              <span className="font-bold">SEMESTER:</span>{" "}
              <span className="underline decoration-slate-400">1ST TRIMESTER</span>
            </p>
            <p>
              <span className="font-bold">NEW STUDENT:</span> [ ]{" "}
              <span className="ml-2 font-bold">OLD STUDENT:</span> [ ]
            </p>
            <Field label="Student No." value={doc.studentNumber} />
            <Field label="Name" value={doc.fullName} />
            <Field label="Course" value={doc.course} />
            <Field label="Level" />
            <Field label="Contact No." value={doc.contactNumber} />
            <Field label="E-mail" value={doc.email} />
          </div>

          <table className="mt-4 w-full border-collapse text-[10px]">
            <thead>
              <tr>
                <th className="border border-slate-800 bg-slate-100 p-1">SUBJECTS</th>
                <th className="border border-slate-800 bg-slate-100 p-1">UNITS</th>
                <th className="border border-slate-800 bg-slate-100 p-1">SUBJECTS</th>
                <th className="border border-slate-800 bg-slate-100 p-1">UNITS</th>
              </tr>
            </thead>
            <tbody>{blankRows(6)}</tbody>
          </table>

          <p className="mt-2 text-[11px]">
            <span className="font-bold">EVALUATED BY:</span>{" "}
            <span className="mt-4 inline-block w-44 border-b border-slate-500" />
          </p>

          <div className="mt-4 border border-slate-800 p-2 text-[10px]">
            <p className="mb-1 text-xs font-bold uppercase">Schedule of Fees</p>
            <div className="grid grid-cols-1 gap-y-1">
              {[
                "Tuition Fee",
                "Miscellaneous Fee",
                "Dental Fee",
                "Library Fee",
                "Internet Fee",
                "Computer Fee",
              ].map((f) => (
                <div key={f} className="flex justify-between border-b border-dotted border-slate-300">
                  <span>{f}</span>
                  <span>__________</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between">
            <p className="text-[11px] font-bold uppercase">Registrar Copy</p>
            <p className="text-[10px] text-slate-600">
              Request No.: <span className="font-mono">{doc.trackingCode}</span>
            </p>
          </div>
        </div>
      );

    case "2nd Copy of Grades":
    case "Certified True Copy - Copy of Grades":
      return (
        <div className="print-area border-2 border-double border-slate-800 p-6 text-slate-900">
          <div className="flex items-center justify-center gap-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/rmclogo.jpg" alt="Regis Marie College" className="h-14 w-14 rounded-md" />
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wide">Regis Marie College</h1>
              <p className="text-xs font-semibold uppercase tracking-widest">Report of Grades</p>
              <p className="text-[10px]">
                1108 Lire Lane Villanueva Village, Parañaque City, Metro Manila 1700
              </p>
              <p className="text-[10px]">
                Contact No.: (02) 8671-01-99 • www.regismariecollege.com
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-10 gap-y-1.5 text-[11px]">
            <Field label="Student No." value={doc.studentNumber} />
            <Field label="Name" value={doc.fullName} />
            <Field label="Academic Year" value={ay || "2025-2026"} />
            <Field label="Sem" value="1ST Trimester" />
            <Field label="Program" value={doc.course} />
            <p className="text-[9px] text-slate-500">
              (Certified True Copy / 2nd Copy of Grades)
            </p>
          </div>

          <table className="mt-4 w-full border-collapse text-[10px]">
            <thead>
              <tr>
                <th className="border border-slate-800 bg-slate-100 p-1">COURSE DESCRIPTION</th>
                <th className="border border-slate-800 bg-slate-100 p-1">UNITS</th>
                <th className="border border-slate-800 bg-slate-100 p-1">FINAL GRADE</th>
                <th className="border border-slate-800 bg-slate-100 p-1">REMARKS</th>
              </tr>
            </thead>
            <tbody>{blankRows(8)}</tbody>
          </table>

          <div className="mt-2 flex items-center justify-between text-[11px]">
            <p>
              <span className="font-bold">Units Earned:</span> ______
            </p>
            <p>
              <span className="font-bold">GWA:</span> ______
            </p>
          </div>

          <p className="mt-2 text-[9px] leading-snug text-slate-700">
            GRADING SYSTEM: 1.0 = 98-100%; 1.25 = 95-97%; 1.50 = 93-94%; 1.75 = 90-92%;
            2.00 = 87-89%; 2.25 = 84-86%; 2.50 = 81-83%; 2.75 = 79-80%; 3.00 = 75-78%;
            5.00 = 70-74%
          </p>
          <p className="mt-3 text-[11px]">
            I certify to the veracity of the above records of <b>{doc.fullName}</b>.
          </p>

          <div className="mt-8 flex items-end justify-end">
            <div className="text-center">
              <p className="text-sm font-semibold">{REGISTRAR}</p>
              <p className="text-[11px] uppercase">College Registrar</p>
            </div>
          </div>

          <p className="mt-3 text-center text-[9px] leading-snug text-slate-600">
            Personal copy, not valid for transfer. Any tampering will lead to the falsification
            of the document. Not valid without school seal.
          </p>
          <p className="mt-1 text-center text-[10px] font-semibold uppercase text-slate-700">
            Choose Excellence! Choose RMC!
          </p>
          <p className="mt-1 text-center text-[9px] text-slate-500">
            Issued on {issuedDateLong} • Request No.: {doc.trackingCode}
          </p>
        </div>
      );

    case "Good Moral Certificate":
      if (variant === "student") return genericCertificate(doc, issuedDateLong);
      return (
        <div className="print-area border-2 border-double border-slate-800 p-6 text-slate-900">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/rmclogo.jpg" alt="Regis Marie College" className="mx-auto h-14 w-14 rounded-md" />
            <h1 className="text-2xl font-bold uppercase tracking-wide">Regis Marie College</h1>
            <p className="text-[10px]">
              #7072 Dollar Lane St., Villanueva Village, Brgy. San Dionisio, Sucat,
            </p>
            <p className="text-[10px]">Parañaque City, Metro Manila 1700</p>
            <p className="text-[10px]">
              Contact No.: (02) 8671-01-99 • admin@regismarie-college.com •
              www.regismariecollege.com
            </p>
            <div className="mx-auto mt-2 w-full border-y border-slate-800 py-1">
              <p className="text-xs font-semibold uppercase tracking-widest">Office of the Registrar</p>
            </div>
            <p className="mt-3 text-sm font-bold uppercase tracking-widest">
              Certificate of Good Moral Character
            </p>
          </div>

          <p className="mt-5 text-xs font-bold">TO WHOM IT MAY CONCERN;</p>

          <p className="mt-3 text-xs leading-relaxed">
            This is to certify that <b>{doc.fullName}</b> was a bona fide{" "}
            <b>{doc.course || "_________________"}</b> (CTP) student of this institution. She has
            demonstrated good moral character throughout her stay in the institution and has not
            been subjected to any disciplinary action for violation of the rules and regulations
            of the College.
          </p>
          <p className="mt-3 text-xs leading-relaxed">
            This certification is being issued upon her request for whatever legal purpose it may
            serve.
          </p>
          <p className="mt-3 text-xs leading-relaxed">Given this {issuedFormal}, Parañaque City.</p>

          <p className="mt-12 text-xs font-bold">CERTIFIED BY:</p>

          <div className="mt-10 flex items-end justify-end">
            <div className="text-center">
              <div className="border-t border-slate-500 px-6 pt-1">
                <p className="text-sm font-semibold">{REGISTRAR}</p>
                <p className="text-xs uppercase">College Registrar</p>
              </div>
            </div>
          </div>

          <p className="mt-10 text-center text-[11px] italic text-slate-600">
            Not valid without the school dry seal.
          </p>
          <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-700">
            Choose Excellence! Choose RMC!
          </p>
        </div>
      );

    default:
      return genericCertificate(doc, issuedDateLong);
  }
}

export default function PrintDocument({
  docs,
  label,
  triggerClass,
  variant = "registrar",
}: {
  docs: PrintDoc[];
  label?: string;
  triggerClass?: string;
  variant?: PrintVariant;
}) {
  const [open, setOpen] = useState(false);
  const count = docs.length;
  const allDocxSupported = docs.every((d) => d.docName === "Good Moral Certificate");

  async function handleDownload() {
    const { buildDocxBlob } = await import("../lib/docxGen");
    try {
      for (const doc of docs) {
        const blob = await buildDocxBlob({
          docName: doc.docName,
          fullName: doc.fullName,
          course: doc.course,
          issuedAt: doc.issuedAt,
          copies: doc.copies,
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${doc.docName} - ${doc.fullName} - ${doc.trackingCode}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      alert("Couldn't generate the Word file for this document.");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={triggerClass ?? "btn-outline flex items-center gap-2"}
      >
        <Printer className="h-4 w-4" />
        {label ?? `Print Paper${count > 1 ? ` (${count} docs)` : ""}`}
      </button>
    );
  }

  const preview = (
    <div className="print-only fixed inset-0 z-[100] overflow-y-auto bg-slate-200 p-4 md:p-10 print:static print:overflow-visible print:bg-white print:p-0">
      <div className="mx-auto w-full max-w-[210mm] space-y-6 print:max-w-none print:space-y-0">
        {docs.map((doc, i) => (
          <div
            key={`${doc.docName}-${i}`}
            className={`bg-white shadow-md print:shadow-none ${
              i < docs.length - 1 ? "break-after-page" : ""
            }`}
          >
            {certificate(doc, variant)}
          </div>
        ))}
      </div>

      <div className="no-print sticky bottom-4 mt-6 flex flex-wrap items-center justify-center gap-3 print:hidden">
        <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print
        </button>
        {allDocxSupported && variant !== "student" && (
          <button onClick={handleDownload} className="btn-outline flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download .docx
          </button>
        )}
        <button onClick={() => setOpen(false)} className="btn-outline">
          Close Preview
        </button>
        <p className="text-xs text-slate-500">
          {count} document{count !== 1 ? "s" : ""} · {count === 1 ? "1 page" : `${count} pages`}
        </p>
      </div>
    </div>
  );

  return <>{typeof document !== "undefined" && createPortal(preview, document.body)}</>;
}