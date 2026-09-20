"use client";

import { useState } from "react";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, string>;

function trackingCode() {
  return "RM-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 900 + 100);
}

export default function ImportRecordsPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; unlinked: number; failed: string[] } | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setHeaders(res.meta.fields ?? []);
        setRows(res.data);
      },
    });
  }

  async function runImport() {
    setImporting(true);
    const ok: number[] = [];
    const unlinked: number[] = [];
    const failed: string[] = [];

    const { data: docs } = await supabase.from("documents").select("id, name");
    const docMap = new Map((docs ?? []).map((d) => [d.name.toLowerCase().trim(), d.id]));

    for (const row of rows) {
      const email = row.student_email?.trim() ?? "";
      const sn = row.student_number?.trim() ?? "";
      const docName = row.document_name?.trim() ?? "";

      if (!email && !sn && !row.full_name?.trim() && !docName) {
        failed.push(`Skipped row — empty: ${JSON.stringify(row)}`);
        continue;
      }

      let profile: { id: string } | null = null;
      if (email) {
        const { data: byEmail } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        profile = (byEmail as { id: string } | null) ?? null;
      }
      if (!profile && sn) {
        const { data: bySn } = await supabase
          .from("profiles")
          .select("id")
          .eq("student_number", sn)
          .maybeSingle();
        profile = (bySn as { id: string } | null) ?? null;
      }

      const documentId = docMap.get(docName.toLowerCase());
      const status = row.status?.trim() || "Completed";
      const copies = Number(row.copies) || 1;
      const recordDate = row.date && !isNaN(Date.parse(row.date)) ? row.date : null;

      // Real student + real document → create a live request (existing behaviour).
      if (profile && documentId) {
        const { error } = await supabase.from("requests").insert({
          tracking_code: trackingCode(),
          user_id: profile.id,
          document_id: documentId,
          status,
          copies,
          created_at: recordDate ? new Date(recordDate).toISOString() : undefined,
        });

        if (error) {
          failed.push(`${email} / ${docName} — ${error.message}`);
        } else {
          ok.push(1);
        }
        continue;
      }

      // Otherwise store as an unlinked HISTORICAL record. This never creates
      // an account, password, or login — the row simply waits until a real
      // student claims it during registration or from Profile settings.
      const { error: histErr } = await supabase.from("imported_records").insert({
        tracking_code: trackingCode(),
        student_email: email || null,
        student_number: sn || null,
        full_name: row.full_name?.trim() || null,
        course: row.course?.trim() || null,
        document_name: docName || null,
        status,
        copies,
        record_date: recordDate,
      });

      if (histErr) {
        failed.push(`${email || sn || "?"} / ${docName} — ${histErr.message}`);
      } else {
        unlinked.push(1);
      }
    }

    setResult({ ok: ok.length, unlinked: unlinked.length, failed });
    setImporting(false);
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">Import Past Records</h2>
        <p className="text-sm text-slate-500">
          Bulk-upload old paper/PHP-system records as a CSV. Rows whose email or student number
          matches an existing account become live requests; everything else is stored as{" "}
          <strong>unlinked historical records</strong> that a student can claim after
          registering — no account or login is ever created from an import.
        </p>
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-medium text-slate-700">CSV columns expected:</p>
        <code className="block rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          full_name, course, student_number, student_email, document_name, status, copies, date
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
                    {headers.map((h) => (
                      <th key={h} className="whitespace-nowrap p-2 font-semibold capitalize">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-b">
                      {headers.map((h) => (
                        <td key={h} className="whitespace-nowrap p-2">
                          {r[h]}
                        </td>
                      ))}
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
            <p className="font-semibold text-emerald-700">
              {result.ok} record{result.ok === 1 ? "" : "s"} imported as live requests.
            </p>
            {result.unlinked > 0 && (
              <p className="font-medium text-brand-700">
                {result.unlinked} record{result.unlinked === 1 ? "" : "s"} stored as{" "}
                <strong>unlinked historical records</strong> — they can be claimed by the student
                after they register (no account was created).
              </p>
            )}
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
