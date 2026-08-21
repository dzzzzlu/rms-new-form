import { redirect, notFound } from "next/navigation";
import { createClient, getProfile } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  Pending: "bg-slate-100 text-slate-700",
  "Payment Verification": "bg-amber-50 text-amber-700",
  Processing: "bg-brand-50 text-brand-700",
  "Ready for Pickup": "bg-indigo-50 text-indigo-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
};

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const requestId = Number(params.id);
  if (isNaN(requestId)) notFound();

  const { data: request } = await supabase
    .from("requests")
    .select("id, tracking_code, purpose, copies, status, guidance_status, clearance_status, class_list, remarks, created_at, updated_at, documents!inner(name, fee, processing_days)")
    .eq("id", requestId)
    .eq("user_id", profile.id)
    .single();

  if (!request) notFound();

  const { data: history } = await supabase
    .from("status_history")
    .select("status, remarks, changed_at")
    .eq("request_id", requestId)
    .order("changed_at", { ascending: true });

  const { data: payment } = await supabase
    .from("payments")
    .select("gcash_reference, amount, status, rejection_reason, verified_at")
    .eq("request_id", requestId)
    .single();

  const doc = Array.isArray(request.documents) ? request.documents[0] : request.documents;
  const totalFee = (doc?.fee ?? 0) * request.copies;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/student/history" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to History
      </Link>

      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-brand-900">{doc?.name}</h2>
            <p className="text-sm text-slate-500">{request.tracking_code}</p>
          </div>
          <span className={`badge text-sm ${STATUS_COLOR[request.status] ?? "bg-slate-100 text-slate-700"}`}>
            {request.status}
          </span>
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-brand-900">Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">Purpose</p>
            <p className="font-medium text-slate-800">{request.purpose || "—"}</p>
          </div>
          <div>
            <p className="text-slate-500">Copies</p>
            <p className="font-medium text-slate-800">{request.copies}</p>
          </div>
          <div>
            <p className="text-slate-500">Fee per copy</p>
            <p className="font-medium text-slate-800">₱{(doc?.fee ?? 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-500">Total</p>
            <p className="font-bold text-brand-700">₱{totalFee.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-500">Processing time</p>
            <p className="font-medium text-slate-800">{doc?.processing_days} days</p>
          </div>
          <div>
            <p className="text-slate-500">Submitted</p>
            <p className="font-medium text-slate-800">{new Date(request.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {request.class_list && (
          <div>
            <p className="text-sm text-slate-500">Class List</p>
            <pre className="whitespace-pre-line rounded bg-slate-50 p-2 text-sm text-slate-700">{request.class_list}</pre>
          </div>
        )}

        {request.remarks && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <p className="font-medium">Remarks:</p>
            <p>{request.remarks}</p>
          </div>
        )}
      </div>

      {payment && (
        <div className="card space-y-2">
          <h3 className="font-semibold text-brand-900">Payment</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500">GCash Reference</p>
              <p className="font-medium text-slate-800">{payment.gcash_reference}</p>
            </div>
            <div>
              <p className="text-slate-500">Amount</p>
              <p className="font-medium text-slate-800">₱{payment.amount}</p>
            </div>
            <div>
              <p className="text-slate-500">Payment Status</p>
              <span className={`badge ${STATUS_COLOR[payment.status] ?? "bg-slate-100 text-slate-700"}`}>
                {payment.status}
              </span>
            </div>
            {payment.verified_at && (
              <div>
                <p className="text-slate-500">Verified</p>
                <p className="font-medium text-slate-800">{new Date(payment.verified_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>
          {payment.status === "Rejected" && payment.rejection_reason && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <p className="font-medium">Rejection reason:</p>
              <p>{payment.rejection_reason}</p>
            </div>
          )}
        </div>
      )}

      <div className="card space-y-3">
        <h3 className="font-semibold text-brand-900">Status Timeline</h3>
        {(!history || history.length === 0) ? (
          <p className="text-sm text-slate-400">No status changes recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((h, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-3 w-3 rounded-full ${i === history.length - 1 ? "bg-brand-500" : "bg-slate-300"}`} />
                  {i < history.length - 1 && <div className="w-px flex-1 bg-slate-200" />}
                </div>
                <div className="pb-3">
                  <p className="text-sm font-medium text-slate-800">{h.status}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(h.changed_at).toLocaleString()}
                  </p>
                  {h.remarks && <p className="text-xs text-slate-600">{h.remarks}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
