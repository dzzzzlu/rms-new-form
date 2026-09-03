import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmailJS } from "@/lib/emailjs";
import { emailVerification } from "@/lib/email-templates";

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

    const { error: insertErr } = await supabase.from("email_verifications").insert({ email, code, expires_at });
    if (insertErr) {
      console.error("Insert error:", insertErr);
    }

    await sendEmailJS({
      to: email,
      subject: "Verify Your Email — Regis Marie College",
      html: emailVerification(code),
    });

    return NextResponse.json({ message: "Verification code sent." });
  } catch (err) {
    console.error("Send verification error:", err);
    return NextResponse.json({ error: "Failed to send code." }, { status: 500 });
  }
}
