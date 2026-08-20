"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import { PAYMENT_CONFIG } from "@/lib/payment-config";
import { validatePurpose, validateCopies, sanitize } from "@/lib/validation";

type Doc = { id: number; name: string; description: string | null; fee: number; processing_days: number };

function trackingCode() {
  const id = crypto.randomUUID().replace(/-/g, "").toUpperCase().slice(0, 12);
  return `RM-${id}`;
}

export default function NewRequestPage() {
  const supabase = createClient();
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [documentId, setDocumentId] = useState<number | "">("");
  const [purpose, setPurpose] = useState("");
  const [copies, setCopies] = useState(1);
  const [gcashRef, setGcashRef] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [classList, setClassList] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("documents")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => setDocs(data ?? []));
  }, []);

  const selectedDoc = docs.find((d) => d.id === documentId);
  const amount = selectedDoc ? selectedDoc.fee * copies : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!documentId) return setError("Please choose a document type.");
    if (!proofFile) return setError("Please attach your GCash payment proof.");
    if (proofFile.size > 5 * 1024 * 1024) return setError("Payment proof must be under 5MB.");

    const purposeErr = validatePurpose(purpose);
    if (purposeErr) return setError(purposeErr);
    const copiesErr = validateCopies(copies);
    if (copiesErr) return setError(copiesErr);
    if (!gcashRef.trim()) return setError("Please enter your GCash reference number.");

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setError("Not signed in.");

    const { data: request, error: reqErr } = await supabase
      .from("requests")
      .insert({
        tracking_code: trackingCode(),
        user_id: user.id,
        document_id: documentId,
        purpose: sanitize(purpose),
        copies,
        status: "Pending",
        class_list: selectedDoc?.name === "Certificate of Enrollment" ? sanitize(classList) : null,
        guidance_status: selectedDoc?.name === "Good Moral Certificate" ? "Pending" : null,
        clearance_status: selectedDoc?.name === "Diploma" ? "Pending" : null,
      })
      .select()
      .single();

    if (reqErr || !request) {
      setLoading(false);
      return setError(reqErr?.message ?? "Could not create request.");
    }

    const path = `${user.id}/${request.id}-${proofFile.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("payment-proofs")
      .upload(path, proofFile);

    if (uploadErr) {
      setLoading(false);
      return setError(uploadErr.message);
    }

    const { error: payErr } = await supabase.from("payments").insert({
      request_id: request.id,
      gcash_reference: gcashRef,
      proof_image: path,
      amount,
      status: "Pending",
    });

    if (payErr) {
      setLoading(false);
      return setError(payErr.message);
    }

    await supabase
      .from("requests")
      .update({ status: "Payment Verification" })
      .eq("id", request.id);

    router.push("/student/history");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">New Document Request</h2>
        <p className="text-sm text-slate-500">Fill in the details and attach your GCash payment proof.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <div>
          <label className="label">Document Type</label>
          <select
            className="input"
            value={documentId}
            onChange={(e) => setDocumentId(Number(e.target.value))}
          >
            <option value="">Select a document…</option>
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — ₱{d.fee.toFixed(2)} ({d.processing_days} days)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Purpose</label>
          <input className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </div>

        <div>
          <label className="label">Number of Copies</label>
          <input
            type="number"
            min={1}
            className="input"
            value={copies}
            onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
          />
        </div>

        {selectedDoc?.name === "Certificate of Enrollment" && (
          <div>
            <label className="label">Class List (subjects currently enrolled)</label>
            <textarea
              className="input min-h-[100px]"
              placeholder={"e.g.\nCS 301 - Data Structures\nCS 302 - Database Systems"}
              value={classList}
              onChange={(e) => setClassList(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">
              This will be printed on your Certificate of Enrollment.
            </p>
          </div>
        )}

        {selectedDoc?.name === "Diploma" && (
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Diploma release requires clearance from the registrar's office. Your request will show as
            "Pending Clearance" until that's completed — this may add processing time.
          </div>
        )}

        {selectedDoc && (
          <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
            Total amount to pay via GCash: <span className="font-bold">₱{amount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 rounded-lg border border-brand-100 bg-white px-4 py-5 text-center">
          <p className="text-sm font-semibold text-brand-900">Scan to pay via GCash</p>
          {PAYMENT_CONFIG.USE_QR_IMAGE ? (
            <img src="/gcash-qr.png" alt="GCash QR code" className="h-40 w-40 rounded-lg border" />
          ) : (
            <QRCodeSVG value={PAYMENT_CONFIG.gcashQrValue} size={160} />
          )}
          <div className="text-sm text-slate-600">
            <p className="font-medium">{PAYMENT_CONFIG.gcashName}</p>
            <p>{PAYMENT_CONFIG.gcashNumber}</p>
          </div>
          <p className="text-xs text-slate-400">
            Scan or send manually, then enter the reference number and screenshot below.
          </p>
        </div>

        <div>
          <label className="label">GCash Reference Number</label>
          <input className="input" value={gcashRef} onChange={(e) => setGcashRef(e.target.value)} required />
        </div>

        <div>
          <label className="label">Payment Proof (screenshot)</label>
          <input
            type="file"
            accept="image/*"
            className="input"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Submitting…" : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
