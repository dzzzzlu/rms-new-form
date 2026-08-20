"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const justVerified = searchParams.get("verified") === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(
        error.message.toLowerCase().includes("email not confirmed")
          ? "Please verify your email before signing in — check your inbox for the confirmation link."
          : error.message
      );
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", data.user.id)
      .single();

    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
      setError("This account has been archived. Please contact the administrator.");
      setLoading(false);
      return;
    }

    const home =
      profile?.role === "admin"
        ? "/admin/dashboard"
        : profile?.role === "registrar"
        ? "/registrar/dashboard"
        : profile?.role === "guidance"
        ? "/guidance/dashboard"
        : "/student/dashboard";

    router.push(home);
    router.refresh();
  }

  async function resendVerification() {
    if (!email) return setError("Enter your email above first.");
    await supabase.auth.resend({ type: "signup", email });
    setResent(true);
  }

  async function handleForgotPassword() {
    if (!email) return setError("Enter your email above first to reset your password.");
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">Regis Marie College</h1>
          <p className="text-sm text-brand-100">Academic Document Request System</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-7 shadow-2xl">
          <h2 className="mb-5 text-lg font-semibold text-slate-800">Sign in</h2>

          {justVerified && (
            <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Email verified — you can sign in now.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
              {error.includes("verify your email") && (
                <button
                  type="button"
                  onClick={resendVerification}
                  className="ml-1 font-semibold underline"
                >
                  Resend verification email
                </button>
              )}
            </div>
          )}

          {resent && (
            <div className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
              Verification email resent — check your inbox.
            </div>
          )}

          {resetSent && (
            <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Password reset email sent — check your inbox for the link.
            </div>
          )}

          <div className="mb-4">
            <label className="label">Email</label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@regismarie.edu.ph"
            />
          </div>

          <div className="mb-2">
            <label className="label">Password</label>
            <input
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="mb-6 text-right">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Sign In"}
          </button>

          <p className="mt-5 text-center text-sm text-slate-500">
            No account yet?{" "}
            <Link href="/register" className="font-semibold text-brand-600 hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
