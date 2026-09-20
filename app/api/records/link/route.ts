import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { linkUnlinkedRecords } from "@/lib/unlinked-records";

export async function POST() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server not configured." }, { status: 500 });
    }

    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, student_number")
      .eq("id", user.id)
      .single();
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const linked = await linkUnlinkedRecords(admin, {
      email: profile.email ?? "",
      studentNumber: profile.student_number ?? "",
      userId: user.id,
    });

    return NextResponse.json({ linked });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not link past records." },
      { status: 500 }
    );
  }
}