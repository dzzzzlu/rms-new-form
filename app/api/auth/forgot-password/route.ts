import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (!profile) {
      return NextResponse.json({ message: "If an account exists, a code has been sent." });
    }

    const code = generateCode();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from("password_resets").insert({ email, code, expires_at });

    await sendEmail({
      to: email,
      subject: "Your Password Reset Code — Regis Marie College",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;text-align:center;">
          <h2 style="color:#0D47A1;">Password Reset Code</h2>
          <p>Use the following 6-digit code to reset your password:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0D47A1;margin:24px 0;">${code}</p>
          <p style="color:#64748b;font-size:12px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ message: "If an account exists, a code has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ message: "If an account exists, a code has been sent." });
  }
}
