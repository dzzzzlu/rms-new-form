"use client";

import { useState } from "react";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";

type Row = {
  student_email: string;
  document_name: string;
  status: string;
  copies?: string;
  date?: string;
};

function trackingCode() {
  return "RM-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 900 + 100);
}

export default function ImportRecordsPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: string[] } | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => setRows(res.data),
    });
  }

  async function runImport() {
    setImporting(true);
    const ok: number[] = [];
    const failed: string[] = [];

    const { data: docs } = await supabase.from("documents").select("id, name");
    const docMap = new Map((docs ?? []).map((d) => [d.name.toLowerCase().trim(), d.id]));

    for (const row of rows) {
      const email = row.student_email?.trim();
      const docName = row.document_name?.trim();
      if (!email || !docName) {
        failed.push(`Skipped row — missing email or document name: ${JSON.stringify(row)}`);
        continue;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      const documentId = docMap.get(docName.toLowerCase());

      if (!profile || !documentId) {
        failed.push(
          `${email} / ${docName} — ${!profile ? "no matching student account" : "unknown document type"}`
        );
        continue;
      }

      const { error } = await supabase.from("requests").insert({
        tracking_code: trackingCode(),
        user_id: profile.id,
        document_id: documentId,
        status: row.status?.trim() || "Completed",
        copies: Number(row.copies) || 1,
        created_at: row.date ? new Date(row.date).toISOString() : undefined,
      });

      if (error) {
        failed.push(`${email} / ${docName} — ${error.message}`);
      } else {
        ok.push(1);
      }
    }

    setResult({ ok: ok.length, failed });
    setImporting(false);
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">Import Past Records</h2>
        <p className="text-sm text-slate-500">
          Bulk-upload old paper/PHP-system records as a CSV. Each student must already have an account
          (matched by email) before importing their records.
        </p>
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-medium text-slate-700">CSV columns expected:</p>
        <code className="block rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          student_email, document_name, status, copies, date
        </code>
        <p className="text-xs text-slate-400">
          <code>document_name</code> must match a document type exactly (e.g. "Transcript of Records").{" "}
          <code>status</code> defaults to "Completed" if left blank. <code>date</code> is optional
          (YYYY-MM-DD).
        </p>

        <input
          type="file"
          accept=".csv"
          className="input"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {rows.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              {fileName}: {rows.length} rows parsed. Preview of first 5:
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    <th className="p-2">Email</th>
                    <th className="p-2">Document</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Copies</th>
                    <th className="p-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{r.student_email}</td>
                      <td className="p-2">{r.document_name}</td>
                      <td className="p-2">{r.status}</td>
                      <td className="p-2">{r.copies}</td>
                      <td className="p-2">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={runImport} disabled={importing} className="btn-primary">
              {importing ? "Importing…" : `Import ${rows.length} Records`}
            </button>
          </div>
        )}

        {result && (
          <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-emerald-700">{result.ok} records imported successfully.</p>
            {result.failed.length > 0 && (
              <div>
                <p className="font-semibold text-red-600">{result.failed.length} failed:</p>
                <ul className="mt-1 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-xs text-slate-600">
                  {result.failed.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
