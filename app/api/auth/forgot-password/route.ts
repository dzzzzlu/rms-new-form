import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmailJS } from "@/lib/emailjs";
import { passwordReset } from "@/lib/email-templates";

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

    await sendEmailJS({
      to: email,
      subject: "Your Password Reset Code — Regis Marie College",
      html: passwordReset(code),
    });

    return NextResponse.json({ message: "If an account exists, a code has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ message: "If an account exists, a code has been sent." });
  }
}
