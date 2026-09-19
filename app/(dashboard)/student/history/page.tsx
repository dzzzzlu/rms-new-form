import { redirect } from "next/navigation";
import { createClient, getProfile } from "@/lib/supabase/server";
import type { RequestStatus } from "@/lib/types";
import Link from "next/link";
import { Clock } from "lucide-react";
import ReceiptModal from "@/components/ReceiptModal";
import { printName } from "@/lib/validation";

const STATUS_COLOR: Record<string, string> = {
  Pending: "bg-slate-100 text-slate-700",
  "Payment Verification": "bg-amber-50 text-amber-700",
  Processing: "bg-brand-50 text-brand-700",
  "Ready for Pickup": "bg-indigo-50 text-indigo-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
  Cancelled: "bg-slate-100 text-slate-600",
};

type HistoryRequest = {
  id: number;
  tracking_code: string;
  purpose: string | null;
  copies: number;
  status: RequestStatus;
  pickup_at: string | null;
  created_at: string;
  documents: { name: string; fee: number } | null;
  payments?: {
    reference_number: string;
    amount: number;
    status: string;
    payment_method: "gcash" | "walk_in";
    verified_at: string | null;
  }[];
};

export default async function HistoryPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const supabase = createClient();

  const { data: requests } = await supabase
    .from("requests")
    .select("id, tracking_code, purpose, copies, status, pickup_at, created_at, documents(name, fee), payments(reference_number, amount, status, payment_method, verified_at)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const typedRequests = (requests ?? []) as unknown as HistoryRequest[];

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">My Request History</h2>
        <p className="text-sm text-slate-500">Track the status of every document request you've submitted.</p>
      </div>

      {typedRequests.length === 0 ? (
        <div className="empty-state card">
          <Clock className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {typedRequests.map((r) => {
            const verifiedPayment = r.payments?.find((p) => p.status === "Verified");
            return (
              <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
                <Link href={`/student/requests/${r.id}`} className="min-w-0 flex-1 hover:opacity-80">
                  <p className="font-semibold text-brand-900">{r.documents?.name}</p>
                  <p className="text-xs text-slate-500">
                    {r.tracking_code} · {r.copies} cop{r.copies > 1 ? "ies" : "y"} ·{" "}
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                  {r.purpose && <p className="mt-1 text-sm text-slate-600">Purpose: {r.purpose}</p>}
                  {r.pickup_at && (
                    <p className="mt-1 text-xs font-medium text-indigo-700">
                      Pickup:{" "}
                      {new Date(r.pickup_at).toLocaleString("en-PH", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  )}
                </Link>
                <div className="flex flex-col items-end gap-2">
                  <span className={`badge ${STATUS_COLOR[r.status] ?? "bg-slate-100 text-slate-700"}`}>
                    {r.status}
                  </span>
                  {verifiedPayment && (
                    <ReceiptModal
                      data={{
                        fullName: printName(
                          profile.first_name,
                          profile.middle_name,
                          profile.last_name,
                          profile.full_name
                        ),
                        course: profile.course,
                        yearLevel: profile.year_level,
                        schoolYear: profile.school_year,
                        documentName: r.documents?.name ?? "Document",
                        trackingCode: r.tracking_code,
                        copies: r.copies,
                        amount: verifiedPayment.amount,
                        referenceNumber: verifiedPayment.reference_number,
                        paidAt: verifiedPayment.verified_at,
                        paymentMethod: verifiedPayment.payment_method,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
