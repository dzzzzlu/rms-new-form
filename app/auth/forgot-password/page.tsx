"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.error) {
      setError(data.error);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
              <Image src="/logo.png" alt="Regis Marie College" width={40} height={40} className="rounded-lg" />
            </div>
            <h1 className="text-xl font-bold text-brand-900">Forgot Password</h1>
            <p className="mt-1 text-sm text-slate-500">Enter your email and we&apos;ll send you a reset code.</p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-700">
                Code sent to <strong>{email}</strong>. Check your inbox.
              </div>
              <Link
                href={`/auth/verify-code?email=${encodeURIComponent(email)}`}
                className="btn-primary flex w-full items-center justify-center"
              >
                Enter Code
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
              )}

              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@regismarie.edu.ph"
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Sending…" : "Send Reset Code"}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-slate-500">
            <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline">
              <ArrowLeft className="h-3 w-3" /> Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
