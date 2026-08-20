"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Payment } from "@/lib/types";
import { CreditCard } from "lucide-react";

type PaymentRow = Payment & {
  requests: { tracking_code: string; profiles: { full_name: string } | null } | null;
};

export default function VerifyPaymentsPage() {
  const supabase = createClient();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previews, setPreviews] = useState<Record<number, string>>({});

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("id, gcash_reference, proof_image, amount, status, request_id, requests(tracking_code, profiles(full_name))")
      .eq("status", "Pending")
      .order("created_at", { ascending: false });
    setPayments((data as unknown as PaymentRow[]) ?? []);

    for (const p of data ?? []) {
      const { data: signed } = await supabase.storage
        .from("payment-proofs")
        .createSignedUrl(p.proof_image, 60 * 10);
      if (signed?.signedUrl) {
        setPreviews((prev) => ({ ...prev, [p.id]: signed.signedUrl }));
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(payment: PaymentRow, approve: boolean, reason?: string) {
    // @ts-expect-error @supabase/ssr SupabaseAuthClient type mismatch — works at runtime
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from("payments")
      .update({
        status: approve ? "Verified" : "Rejected",
        verified_by: user?.id,
        verified_at: new Date().toISOString(),
        rejection_reason: reason ?? null,
      })
      .eq("id", payment.id);

    await supabase
      .from("requests")
      .update({ status: approve ? "Processing" : "Rejected" })
      .eq("id", payment.request_id);

    load();
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">Verify Payments</h2>
        <p className="text-sm text-slate-500">Review GCash proof and approve or reject each payment.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="card space-y-3">
              <div className="skeleton h-4 w-36" />
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-40 w-full" />
              <div className="flex gap-2">
                <div className="skeleton h-10 flex-1" />
                <div className="skeleton h-10 flex-1" />
              </div>
            </div>
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="empty-state card">
          <CreditCard className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No pending payments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {payments.map((p) => (
            <div key={p.id} className="card space-y-3">
              <div>
                <p className="font-semibold text-brand-900">{p.requests?.profiles?.full_name}</p>
                <p className="text-xs text-slate-500">{p.requests?.tracking_code}</p>
              </div>
              {previews[p.id] && (
                <img src={previews[p.id]} alt="Payment proof" className="w-full rounded-lg border" />
              )}
              <p className="text-sm text-slate-600">
                Ref: <span className="font-medium">{p.gcash_reference}</span> · ₱{p.amount}
              </p>
              <div className="flex gap-2">
                <button onClick={() => decide(p, true)} className="btn-primary flex-1">
                  Approve
                </button>
                <button
                  onClick={() => decide(p, false, "Payment could not be verified")}
                  className="btn-outline flex-1"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
