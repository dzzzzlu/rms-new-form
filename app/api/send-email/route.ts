import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, subject, html } = await req.json();
    if (!userId || !subject || !html) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (!profile?.email) {
      return NextResponse.json({ error: "No email found." }, { status: 400 });
    }

    await sendEmail({
      to: profile.email,
      subject,
      html,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("Send email error:", err);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}
