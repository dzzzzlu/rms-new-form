"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  FileText,
  Clock,
  Shield,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";

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
  const justVerified = searchParams.get("verified") === "1";
  const justRegistered = searchParams.get("registered") === "1";

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
    router.push(`/auth/forgot-password?email=${encodeURIComponent(email)}`);
  }

  const features = [
    { icon: FileText, label: "Request documents online", desc: "No more long queues at the registrar" },
    { icon: Clock, label: "Track in real-time", desc: "Know exactly where your request is" },
    { icon: Shield, label: "Secure payments", desc: "Pay via GCash with proof upload" },
  ];

  return (
    <main className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-10 lg:flex">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Image src="/logo.png" alt="Regis Marie College" width={32} height={32} className="rounded-lg" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Regis Marie College</p>
              <p className="text-[11px] text-brand-200">Document Request System</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold leading-tight text-white lg:text-4xl">
              Request academic documents
              <br />
              <span className="text-brand-300">hassle-free.</span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-200">
              A digital platform for Regis Marie College students and alumni to request
              transcripts, certificates, and other academic documents — anytime, anywhere.
            </p>
          </div>

          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <f.icon className="h-4 w-4 text-brand-200" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{f.label}</p>
                  <p className="text-xs text-brand-300">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-brand-400">
          &copy; {new Date().getFullYear()} Regis Marie College. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-brand-50/40 px-6 py-10 lg:w-1/2">
        {/* decorative circles */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-100/30" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-brand-200/20" />

        <div className="relative z-10 w-full max-w-md space-y-6">
          <div className="rounded-2xl border border-brand-100/60 bg-white p-8 shadow-xl shadow-brand-900/5">
            <div className="mb-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 lg:hidden">
                <Image src="/logo.png" alt="Regis Marie College" width={40} height={40} className="rounded-lg" />
              </div>
              <h2 className="text-2xl font-bold text-brand-900">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-500">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {justVerified && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                  Email verified — you can sign in now.
                </div>
              )}

              {justRegistered && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                  Account created successfully — you can now sign in.
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
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
                <div className="rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-brand-700">
                  Verification email resent — check your inbox.
                </div>
              )}

              <div>
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

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  required
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2">
                {loading ? "Signing in…" : "Sign In"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              No account yet?{" "}
              <Link href="/register" className="font-semibold text-brand-600 hover:underline">
                Register here
              </Link>
            </p>
          </div>

          {/* How it works */}
          <div className="rounded-xl border border-brand-100/40 bg-white/60 p-5 backdrop-blur">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">How it works</p>
            <div className="space-y-2.5">
              {[
                { step: "1", text: "Register your student or alumni account" },
                { step: "2", text: "Submit a document request and pay via GCash" },
                { step: "3", text: "Track your request in real-time until pickup" },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                    {s.step}
                  </span>
                  <p className="text-sm text-slate-600">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
