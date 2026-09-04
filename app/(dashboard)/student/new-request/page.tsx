"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import { PAYMENT_CONFIG } from "@/lib/payment-config";
import { validatePurpose, validateCopies, sanitize } from "@/lib/validation";
import SampleTemplates from "@/components/SampleTemplates";

type Doc = { id: number; name: string; description: string | null; fee: number; processing_days: number };

function trackingCode() {
  const id = crypto.randomUUID().replace(/-/g, "").toUpperCase().slice(0, 12);
  return `RM-${id}`;
}

export default function NewRequestPage() {
  const supabase = createClient();
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [purpose, setPurpose] = useState("");
  const [copies, setCopies] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "walk_in">("gcash");
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

  const selectedDocs = docs.filter((d) => selectedIds.includes(d.id));
  const hasCertificateEnrollment = selectedDocs.some((d) => d.name === "Certificate of Enrollment");
  const hasGoodMoral = selectedDocs.some((d) => d.name === "Good Moral Certificate");
  const amount = selectedDocs.reduce((sum, d) => sum + d.fee * copies, 0);

  function toggleDoc(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedIds.length === 0) return setError("Please select at least one document.");

    const purposeErr = validatePurpose(purpose);
    if (purposeErr) return setError(purposeErr);
    const copiesErr = validateCopies(copies);
    if (copiesErr) return setError(copiesErr);

    if (hasCertificateEnrollment && !classList.trim()) {
      return setError("Please enter your class list for the Certificate of Enrollment.");
    }

    if (paymentMethod === "gcash") {
      if (!proofFile) return setError("Please attach your GCash payment proof.");
      if (proofFile.size > 5 * 1024 * 1024) return setError("Payment proof must be under 5MB.");
      if (!gcashRef.trim()) return setError("Please enter your GCash reference number.");
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setError("Not signed in.");

    const createdIds: number[] = [];
    let proofPath = "";

    if (paymentMethod === "gcash" && proofFile) {
      proofPath = `${user.id}/${Date.now()}-${proofFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("payment-proofs")
        .upload(proofPath, proofFile);

      if (uploadErr) {
        setLoading(false);
        return setError(uploadErr.message);
      }
    }

    for (const doc of selectedDocs) {
      const { data: request, error: reqErr } = await supabase
        .from("requests")
        .insert({
          tracking_code: trackingCode(),
          user_id: user.id,
          document_id: doc.id,
          purpose: sanitize(purpose),
          copies,
          status: "Pending",
          class_list: doc.name === "Certificate of Enrollment" ? sanitize(classList) : null,
          guidance_status: doc.name === "Good Moral Certificate" ? "Pending" : null,
        })
        .select("id")
        .single();

      if (reqErr || !request) {
        setLoading(false);
        return setError(reqErr?.message ?? "Could not create request.");
      }

      createdIds.push(request.id);

      if (paymentMethod === "gcash") {
        const { error: payErr } = await supabase.from("payments").insert({
          request_id: request.id,
          gcash_reference: gcashRef,
          proof_image: proofPath,
          amount: doc.fee * copies,
          status: "Pending",
          payment_method: "gcash",
        });

        if (payErr) {
          setLoading(false);
          return setError(payErr.message);
        }

        await supabase.from("requests").update({ status: "Payment Verification" }).eq("id", request.id);
      } else {
        await supabase.from("payments").insert({
          request_id: request.id,
          gcash_reference: "",
          proof_image: "",
          amount: doc.fee * copies,
          status: "Verified",
          payment_method: "walk_in",
        });
      }
    }

    router.push("/student/history");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">New Document Request</h2>
        <p className="text-sm text-slate-500">Fill in the details and choose your payment method.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <div>
          <label className="label">Document Type (select one or more)</label>
          <div className="space-y-2">
            {docs.map((d) => {
              const checked = selectedIds.includes(d.id);
              return (
                <label
                  key={d.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition ${
                    checked
                      ? "border-brand-600 bg-brand-50"
                      : "border-slate-200 bg-white hover:border-brand-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDoc(d.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{d.name}</p>
                      {d.description && (
                        <p className="text-xs text-slate-500">{d.description}</p>
                      )}
                      <SampleTemplates docName={d.name} docDescription={d.description} />
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">₱{d.fee.toFixed(2)}</p>
                    <p>{d.processing_days} days</p>
                  </div>
                </label>
              );
            })}
          </div>
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

        {hasCertificateEnrollment && (
          <div>
            <label className="label">Class List (subjects currently enrolled)</label>
            <textarea
              className="input min-h-[100px]"
              placeholder={"e.g.\nCS 301 - Data Structures\nCS 302 - Database Systems"}
              value={classList}
              onChange={(e) => setClassList(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-slate-400">
              This will be printed on your Certificate of Enrollment.
            </p>
          </div>
        )}

        {hasGoodMoral && (
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Good Moral Certificate requests must be approved by the Guidance Department before the
            registrar can release them.
          </div>
        )}

        {selectedDocs.length > 0 && (
          <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
            <p>
              {selectedDocs.length} document{selectedDocs.length > 1 ? "s" : ""} selected:
            </p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {selectedDocs.map((d) => (
                <li key={d.id}>
                  {d.name} — ₱{(d.fee * copies).toFixed(2)} × {copies} cop{copies > 1 ? "ies" : "y"}
                </li>
              ))}
            </ul>
            <p className="mt-2 font-bold">
              Total amount to pay: ₱{amount.toFixed(2)}
            </p>
          </div>
        )}

        <div>
          <label className="label">Payment Method</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod("gcash")}
              className={`rounded-lg border-2 px-4 py-4 text-center transition ${
                paymentMethod === "gcash"
                  ? "border-brand-600 bg-brand-50 text-brand-900"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <p className="font-semibold">GCash</p>
              <p className="mt-1 text-xs">Pay online via GCash</p>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("walk_in")}
              className={`rounded-lg border-2 px-4 py-4 text-center transition ${
                paymentMethod === "walk_in"
                  ? "border-brand-600 bg-brand-50 text-brand-900"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <p className="font-semibold">Walk-in</p>
              <p className="mt-1 text-xs">Pay at the registrar's office</p>
            </button>
          </div>
        </div>

        {paymentMethod === "gcash" && (
          <>
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
          </>
        )}

        {paymentMethod === "walk_in" && (
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">Walk-in Payment</p>
            <p className="mt-1">Pay <strong>₱{amount.toFixed(2)}</strong> at the registrar's office. Your request will be processed once payment is confirmed.</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Submitting…" : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
