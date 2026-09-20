import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { findUnlinkedRecords } from "@/lib/unlinked-records";

export async function POST(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server not configured." }, { status: 500 });
    }

    const { email, student_number } = await req.json();
    if (!email && !student_number) {
      return NextResponse.json({ count: 0, records: [] });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const records = await findUnlinkedRecords(admin, {
      email: String(email ?? ""),
      studentNumber: String(student_number ?? ""),
    });

    return NextResponse.json({
      count: records.length,
      records: records.map((r) => ({
        id: r.id,
        tracking_code: r.tracking_code,
        document_name: r.document_name,
        full_name: r.full_name,
        course: r.course,
        copies: r.copies,
        record_date: r.record_date,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Could not check for past records." }, { status: 500 });
  }
}