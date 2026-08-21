import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) return NextResponse.json({ error: "Email and code are required." }, { status: 400 });

    const { data: verification } = await supabase
      .from("email_verifications")
      .select("id")
      .eq("email", email)
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!verification) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
    }

    await supabase.from("email_verifications").update({ used: true }).eq("id", verification.id);

    const { data: authUser } = await supabase.auth.admin.getUserByEmail(email);
    if (!authUser?.user) {
      return NextResponse.json({ error: "User not found." }, { status: 400 });
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(authUser.user.id, {
      email_confirm: true,
    });
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
