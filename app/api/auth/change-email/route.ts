import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendEmailJS } from "@/lib/emailjs";
import { emailVerification } from "@/lib/email-templates";
import { validateEmail } from "@/lib/validation";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const { action, new_email, code } = await req.json();
    if (!new_email) return NextResponse.json({ error: "New email is required." }, { status: 400 });

    const emailErr = validateEmail(new_email);
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Verification service is not configured on the server." },
        { status: 500 }
      );
    }

    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (action === "send") {
      const c = generateCode();
      const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await admin.from("email_verifications").insert({ email: new_email, code: c, expires_at });

      await sendEmailJS({
        to: new_email,
        subject: "Verify Your New Email — Regis Marie College",
        html: emailVerification(c),
      });

      return NextResponse.json({ message: "Verification code sent to the new address." });
    }

    if (action === "confirm") {
      if (!code) return NextResponse.json({ error: "Code is required." }, { status: 400 });

      const { data: verification } = await admin
        .from("email_verifications")
        .select("id")
        .eq("email", new_email)
        .eq("code", code)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!verification) {
        return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
      }

      await admin.from("email_verifications").update({ used: true }).eq("id", verification.id);

      const { error: updateAuthErr } = await admin.auth.admin.updateUserById(user.id, {
        email: new_email,
        email_confirm: true,
      });
      if (updateAuthErr) {
        return NextResponse.json({ error: updateAuthErr.message }, { status: 500 });
      }

      await admin.from("profiles").update({ email: new_email }).eq("id", user.id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}