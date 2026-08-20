"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Payment } from "@/lib/types";
import { CreditCard } from "lucide-react";

type PaymentRow = Payment & {
  requests: {
    tracking_code: string;
    status: string;
    documents: { name: string } | null;
  } | null;
};

const STATUS_COLOR: Record<string, string> = {
  Pending: "bg-slate-100 text-slate-700",
  Verified: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
};

export default function StudentPaymentsPage() {
  const supabase = createClient();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previews, setPreviews] = useState<Record<number, string>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("payments")
        .select("id, gcash_reference, proof_image, amount, status, rejection_reason, created_at, requests(tracking_code, status, documents(name))")
        .eq("requests.user_id", user.id)
        .order("created_at", { ascending: false });

      setPayments((data as unknown as PaymentRow[]) ?? []);

      const signedUrls = await Promise.all(
        (data ?? []).map(async (p) => {
          const { data: signed } = await supabase.storage
            .from("payment-proofs")
            .createSignedUrl(p.proof_image, 60 * 10);
          return [p.id, signed?.signedUrl ?? ""] as const;
        })
      );
      setPreviews(Object.fromEntries(signedUrls.filter(([, url]) => url)));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">My Payments</h2>
        <p className="text-sm text-slate-500">Track the status of your GCash payment submissions.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="card space-y-3">
              <div className="skeleton h-4 w-48" />
              <div className="skeleton h-40 w-full" />
            </div>
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="empty-state card">
          <CreditCard className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No payments yet.</p>
          <p className="text-xs text-slate-400">Submit a document request to make your first payment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div key={p.id} className="card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-brand-900">{p.requests?.documents?.name}</p>
                  <p className="text-xs text-slate-500">{p.requests?.tracking_code}</p>
                </div>
                <span className={`badge ${STATUS_COLOR[p.status] ?? "bg-slate-100 text-slate-700"}`}>
                  {p.status}
                </span>
              </div>

              {previews[p.id] && (
                <a href={previews[p.id]} target="_blank" rel="noopener noreferrer">
                  <img src={previews[p.id]} alt="Payment proof" className="w-full max-w-xs rounded-lg border hover:opacity-90" />
                </a>
              )}

              <div className="text-sm text-slate-600">
                <p>Ref: <span className="font-medium">{p.gcash_reference}</span> · ₱{p.amount}</p>
                <p>Submitted: {new Date(p.created_at).toLocaleDateString()}</p>
              </div>

              {p.status === "Rejected" && p.rejection_reason && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  <p className="font-medium">Rejection reason:</p>
                  <p>{p.rejection_reason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
