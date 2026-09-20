import type { SupabaseClient } from "@supabase/supabase-js";

export type UnlinkedRecord = {
  id: number;
  tracking_code: string;
  student_number: string | null;
  student_email: string | null;
  full_name: string | null;
  course: string | null;
  document_name: string | null;
  status: string | null;
  copies: number;
  record_date: string | null;
  student_id: string | null;
  created_at: string;
};

/** Escape ilike wildcards so user-supplied text can't broaden a match. */
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (m) => "\\" + m);
}

/**
 * Builds a PostgREST `.or()` filter that matches on EITHER the email OR the
 * student number (a match on either one should surface the link prompt).
 * Returns null when there is nothing to match against.
 */
export function buildMatchFilter(email: string, studentNumber: string): string | null {
  const parts: string[] = [];
  if (email.trim()) {
    parts.push(`student_email.ilike.${escapeLike(email.trim())}`);
  }
  if (studentNumber.trim()) {
    parts.push(`student_number.eq.${studentNumber.trim()}`);
  }
  return parts.length ? parts.join(",") : null;
}

/** Finds unlinked historical records matching email OR student number. */
export async function findUnlinkedRecords(
  supabase: SupabaseClient,
  { email, studentNumber }: { email: string; studentNumber: string },
  limit = 50
): Promise<UnlinkedRecord[]> {
  const filter = buildMatchFilter(email, studentNumber);
  if (!filter) return [];

  const { data } = await supabase
    .from("imported_records")
    .select(
      "id, tracking_code, student_number, student_email, full_name, course, document_name, status, copies, record_date, student_id, created_at"
    )
    .is("student_id", null)
    .or(filter)
    .order("record_date", { ascending: false, nullsFirst: false })
    .limit(limit);

  return (data as UnlinkedRecord[]) ?? [];
}

/**
 * Links unlinked historical records to a user account. Only rows whose
 * student_id is currently null are ever touched, so records already linked
 * to a different account are never overwritten. Returns how many were linked.
 */
export async function linkUnlinkedRecords(
  supabase: SupabaseClient,
  {
    email,
    studentNumber,
    userId,
  }: { email: string; studentNumber: string; userId: string }
): Promise<number> {
  const filter = buildMatchFilter(email, studentNumber);
  if (!filter) return 0;

  const { data, error } = await supabase
    .from("imported_records")
    .update({ student_id: userId })
    .is("student_id", null)
    .or(filter)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}