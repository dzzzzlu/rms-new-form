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
    const {
      email,
      code,
      password,
      full_name,
      student_number,
      course,
      contact_number,
      is_alumni,
      school_year,
    } = await req.json();
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

    // Two-phase registration: the account does NOT exist yet until the code is
    // verified. The register page only sent the verification code + kept the
    // details on the device, so the email is never "taken" before ownership is
    // proven. Here we create the auth user (pending approval, email confirmed).
    let authUserId: string | null = null;
    const meta = {
      full_name,
      student_number,
      course,
      contact_number,
      is_alumni: Boolean(is_alumni),
      school_year: school_year ?? null,
    };

    if (password) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: meta,
      });
      if (createErr) {
        // Already exists (e.g. orphaned user from the old flow) → reuse it and
        // refresh the password to the one the user just chose.
        if (/already|exists|registered/i.test(createErr.message)) {
          const existing = await findAuthUserByEmail(email);
          if (!existing) {
            return NextResponse.json({ error: createErr.message }, { status: 500 });
          }
          authUserId = existing.id;
        } else {
          return NextResponse.json({ error: createErr.message }, { status: 500 });
        }
      } else {
        authUserId = created.user?.id ?? null;
      }
    }

    if (!authUserId) {
      const existing = await findAuthUserByEmail(email);
      if (!existing) {
        return NextResponse.json(
          { error: "No account found for this email. Please register again." },
          { status: 400 }
        );
      }
      authUserId = existing.id;
    }

    // Ensure a profile row exists for the auth user (the signup trigger is not
    // guaranteed to have run on every database), otherwise create it from the
    // auth user metadata so pending approval + login work.
    let { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, is_active, email_verified")
      .eq("id", authUserId)
      .maybeSingle();

    if (!profile) {
      const authUser = await findAuthUserByEmail(email);
      const userMeta = authUser?.user_metadata ?? meta;
      const { data: created, error: insertErr } = await supabase
        .from("profiles")
        .insert({
          id: authUserId,
          full_name: userMeta.full_name ?? authUser?.email ?? email,
          email: authUser?.email ?? email,
          role: "student",
          student_number: userMeta.student_number ?? null,
          course: userMeta.course ?? null,
          contact_number: userMeta.contact_number ?? null,
          is_alumni: Boolean(userMeta.is_alumni),
          school_year: userMeta.school_year ?? null,
          is_active: false,
          email_verified: false,
        })
        .select("id, full_name, is_active, email_verified")
        .single();
      if (insertErr || !created) {
        console.error("Profile recreate error:", insertErr?.message ?? insertErr);
        return NextResponse.json(
          { error: `Could not create the profile for this account. ${insertErr?.message ?? ""}` },
          { status: 500 }
        );
      }
      profile = created;
    }

    const wasFirstVerification = profile.email_verified === false;

    const { error: updateErr } = await supabase.auth.admin.updateUserById(authUserId, {
      email_confirm: true,
      ...(password ? { password } : {}),
    });
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await supabase.from("profiles").update({ email_verified: true }).eq("id", authUserId);

    // First-time verification → the new account is now PENDING admin approval:
    // force it inactive (so it cannot sign in), put it in the Admin Approvals
    // queue, email the student, and tell admins on the bell.
    if (wasFirstVerification) {
      await supabase.from("profiles").update({ is_active: false }).eq("id", authUserId);

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