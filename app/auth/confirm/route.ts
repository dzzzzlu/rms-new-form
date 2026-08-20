import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "signup" | "magiclink" | "recovery" | "email_change" | null;

  if (token_hash && type) {
    const supabase = createClient();
    // @ts-expect-error @supabase/ssr SupabaseAuthClient type mismatch — works at runtime
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect("/login?verified=1");
    }
  }

  redirect("/login?verified=0");
}
