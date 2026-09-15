import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmailJS } from "@/lib/emailjs";
import { accountWaitingApproval } from "@/lib/email-templates";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findAuthUserByEmail(email: string) {
  let page = 1;
  while (page <= 10) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    const user = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (!data || data.users.length < 1000) break;
    page++;
  }
  return null;
}

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
      console.error("No verification found for email:", email, "code:", code);
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
    }

    await supabase.from("email_verifications").update({ used: true }).eq("id", verification.id);

    let { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, is_active, email_verified")
      .eq("email", email)
      .maybeSingle();

    // If the signup trigger never created a profile row, recreate it from the
    // auth user so verification can finish instead of failing with an error.
    if (!profile) {
      const authUser = await findAuthUserByEmail(email);
      if (!authUser) {
        return NextResponse.json({ error: "No account found for this email." }, { status: 400 });
      }
      const meta = authUser.user_metadata ?? {};
      const { data: created, error: insertErr } = await supabase
        .from("profiles")
        .insert({
          id: authUser.id,
          full_name: meta.full_name ?? authUser.email ?? email,
          email: authUser.email ?? email,
          role: "student",
          student_number: meta.student_number ?? null,
          course: meta.course ?? null,
          contact_number: meta.contact_number ?? null,
          is_alumni: meta.is_alumni ?? false,
          school_year: meta.school_year ?? null,
          is_active: false,
          email_verified: false,
        })
        .select("id, full_name, is_active, email_verified")
        .single();
      if (insertErr || !created) {
        console.error("Profile recreate error:", insertErr);
        return NextResponse.json({ error: "Could not create the profile for this account." }, { status: 500 });
      }
      profile = created;
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(profile.id, {
      email_confirm: true,
    });
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await supabase.from("profiles").update({ email_verified: true }).eq("id", profile.id);

    // First-time verification → new signup is now pending admin approval.
    // Force it inactive (even if the DB trigger hasn't been applied yet), put
    // it in the Admin Approvals queue, and tell admins on the bell.
    if (profile.email_verified === false) {
      await supabase.from("profiles").update({ is_active: false }).eq("id", profile.id);

      try {
        await sendEmailJS({
          to: email,
          subject: "Your Account Is Waiting for Approval — Regis Marie College",
          html: accountWaitingApproval(profile.full_name ?? "there"),
        });
      } catch (err) {
        console.error("Waiting-for-approval email error:", err);
      }

      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .eq("is_active", true);
      if (admins && admins.length > 0) {
        await supabase.from("notifications").insert(
          admins.map((a) => ({
            user_id: a.id,
            message: `New signup pending approval: ${profile.full_name ?? "New student"} (${email})`,
            link: "/admin/approvals",
          }))
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
