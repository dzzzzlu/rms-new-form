import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

    const code = generateCode();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from("email_verifications").insert({ email, code, expires_at });

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL ?? "Regis Marie College <onboarding@resend.dev>";

    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email,
          subject: "Verify Your Email — Regis Marie College",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;text-align:center;">
              <h2 style="color:#0D47A1;">Welcome to Regis Marie College RMS</h2>
              <p>Use the following 6-digit code to verify your email address:</p>
              <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0D47A1;margin:24px 0;">${code}</p>
              <p style="color:#64748b;font-size:12px;">This code expires in 10 minutes. If you didn't create an account, ignore this email.</p>
            </div>
          `,
        }),
      });
    }

    return NextResponse.json({ message: "Verification code sent." });
  } catch {
    return NextResponse.json({ error: "Failed to send code." }, { status: 500 });
  }
}
