import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, token, password } = await req.json();
    if (!email || !token || !password) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }

    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    if (!/[a-zA-Z]/.test(password)) return NextResponse.json({ error: "Password must contain a letter." }, { status: 400 });
    if (!/[0-9]/.test(password)) return NextResponse.json({ error: "Password must contain a number." }, { status: 400 });

    const { data: reset } = await supabase
      .from("password_resets")
      .select("id")
      .eq("email", email)
      .eq("code", token)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!reset) {
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 400 });
    }

    const { data: authUser } = await supabase.auth.admin.getUserByEmail(email);
    if (!authUser?.user) {
      return NextResponse.json({ error: "User not found." }, { status: 400 });
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(authUser.user.id, { password });
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await supabase.from("password_resets").update({ used: true }).eq("id", reset.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
