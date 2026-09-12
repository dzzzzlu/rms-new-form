"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  CreditCard,
  FileBarChart,
  FilePlus,
  FileText,
  History,
  ListChecks,
  MapPin,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";

type Role = "home" | "student" | "registrar" | "admin";

const CONTENT: Record<
  Role,
  {
    eyebrow?: string;
    title: string;
    sub: string;
    cards: { Icon: LucideIcon; title: string; desc: string }[];
  }
> = {
  home: {
    eyebrow: "RMC WILDCATS",
    title: "Request your academic documents, fully online",
    sub: "Transcripts, certificates, and diplomas — track every request from submission to pickup.",
    cards: [
      { Icon: FileText, title: "For students", desc: "Request documents and pay via GCash." },
      { Icon: ClipboardCheck, title: "For the registrar", desc: "Verify payments and update statuses." },
      { Icon: BarChart3, title: "For administrators", desc: "Manage accounts and view analytics." },
    ],
  },
  student: {
    eyebrow: "STUDENT PORTAL",
    title: "Your documents, one tap away",
    sub: "Request a transcript, pay via GCash, and watch it move from pending to ready — no more lining up at the registrar's window.",
    cards: [
      { Icon: FilePlus, title: "New request", desc: "Start a fresh document request in minutes." },
      { Icon: MapPin, title: "Track status", desc: "Follow your request from pending to ready." },
      { Icon: History, title: "Request history", desc: "Review everything you've requested before." },
    ],
  },
  registrar: {
    eyebrow: "REGISTRAR PORTAL",
    title: "Keep every request moving",
    sub: "Verify GCash payments, update statuses in one click, and export reports — all requests in one queue.",
    cards: [
      { Icon: ListChecks, title: "Manage requests", desc: "See and update every request in one queue." },
      { Icon: CreditCard, title: "Verify payments", desc: "Confirm GCash references before processing." },
      { Icon: Upload, title: "Export reports", desc: "Pull request and revenue data anytime." },
    ],
  },
  admin: {
    eyebrow: "ADMIN PORTAL",
    title: "See the whole system at a glance",
    sub: "Manage user roles, watch demand trends by document and month, and keep the institution's data exportable.",
    cards: [
      { Icon: Users, title: "Manage users", desc: "Control roles and access across the system." },
      { Icon: TrendingUp, title: "Analytics", desc: "Track demand by status, month, and document." },
      { Icon: FileBarChart, title: "Reports", desc: "Institution-wide, exportable at any time." },
    ],
  },
};

const TABS: { key: Role; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "student", label: "Student" },
  { key: "registrar", label: "Registrar" },
  { key: "admin", label: "Admin" },
];

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
  const [role, setRole] = useState<Role>("home");
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
      .select("role, is_active, email_verified")
      .eq("id", data.user.id)
      .single();

    if (profile && profile.email_verified === false) {
      await supabase.auth.signOut();
      setError("Please verify your email before signing in — enter the 6-digit code we emailed you.");
      setLoading(false);
      return;
    }

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

  const c = CONTENT[role];

  return (
    <main className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-8 lg:flex xl:p-10">
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

          <nav className="mt-7 flex flex-wrap gap-2" aria-label="Portal preview">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setRole(t.key)}
                aria-pressed={role === t.key}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  role === t.key
                    ? "bg-brand-300 text-brand-950"
                    : "text-brand-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-8 space-y-5">
          {c.eyebrow && (
            <p className="text-[11px] font-bold tracking-widest text-brand-300">{c.eyebrow}</p>
          )}
          <h1 className="text-3xl font-bold leading-tight text-white lg:text-4xl">{c.title}</h1>
          <p className="max-w-md text-sm leading-relaxed text-brand-200">{c.sub}</p>

          <div className="space-y-3">
            {c.cards.map((f) => (
              <div key={f.title} className="flex items-start gap-3 rounded-xl bg-white/10 p-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <f.Icon className="h-4 w-4 shrink-0 text-brand-200" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-brand-300">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8 text-[11px] text-brand-400">
          &copy; {new Date().getFullYear()} Regis Marie College. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-brand-50/40 px-6 py-10 lg:w-1/2">
        {/* background watermark */}
        <div
          className="pointer-events-none absolute inset-0 bg-center bg-no-repeat bg-contain opacity-[0.04]"
          style={{ backgroundImage: "url('/wildd.jpg')" }}
        />
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
