// Supabase Edge Function: send-status-email
// Triggered by a Database Webhook on the "requests" table (UPDATE event).
// Sends the requesting student an email via Resend whenever the status changes.
//
// Deploy: supabase functions deploy send-status-email
// Secrets needed (set with `supabase secrets set`):
//   RESEND_API_KEY   - from resend.com/api-keys
//   FROM_EMAIL       - a verified sender, e.g. "Regis Marie Registrar <registrar@yourdomain.com>"
//   SUPABASE_URL             - auto-provided by Supabase at runtime
//   SUPABASE_SERVICE_ROLE_KEY - auto-provided by Supabase at runtime

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "Regis Marie Registrar <onboarding@resend.dev>";

const STATUS_MESSAGE: Record<string, string> = {
  Pending: "We've received your request and it's awaiting review.",
  "Payment Verification": "We're verifying your GCash payment.",
  Processing: "Your payment is verified — your document is now being processed.",
  "Ready for Pickup": "Your document is ready! Please visit the registrar's office to claim it.",
  Completed: "Your request has been completed. Thank you!",
  Rejected: "There was an issue with your request. Please check your payment details or contact the registrar's office.",
};

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;
    const oldRecord = payload.old_record;

    // Only send an email if the status actually changed.
    if (!record || !oldRecord || record.status === oldRecord.status) {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", record.user_id)
      .single();

    const { data: document } = await supabase
      .from("documents")
      .select("name")
      .eq("id", record.document_id)
      .single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ error: "No profile email found" }), { status: 200 });
    }

    const statusNote = STATUS_MESSAGE[record.status] ?? "";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color:#0D47A1;">Regis Marie College — Document Request Update</h2>
        <p>Hi ${profile.full_name ?? "there"},</p>
        <p>Your request <strong>${record.tracking_code}</strong> for
           <strong>${document?.name ?? "your document"}</strong> is now:</p>
        <p style="font-size:18px; font-weight:bold; color:#0D47A1;">${record.status}</p>
        <p>${statusNote}</p>
        <p style="color:#64748b; font-size:12px; margin-top:24px;">
          This is an automated message from the Regis Marie College Document Request System.
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: profile.email,
        subject: `Your document request is now: ${record.status}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: errText }), { status: 200 });
    }

    // Mirror the same message into the in-app notifications table.
    await supabase.from("notifications").insert({
      user_id: record.user_id,
      request_id: record.id,
      message: `${document?.name ?? "Your document"} is now "${record.status}". ${statusNote}`,
    });

    return new Response(JSON.stringify({ sent: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 200 });
  }
});
