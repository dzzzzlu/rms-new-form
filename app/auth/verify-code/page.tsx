"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useResendCooldown } from "@/lib/resend-cooldown";

export default function VerifyCodePage() {
  return (
    <Suspense fallback={null}>
      <VerifyCodeForm />
    </Suspense>
  );
}

function VerifyCodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendOk, setResendOk] = useState(false);
  const { seconds: timer, disabled: resendDisabled, restart } = useResendCooldown();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.error) {
      setError(data.error);
    } else {
      router.push(`/auth/new-password?email=${encodeURIComponent(data.email)}&token=${data.token}`);
    }
  }

  async function handleResend() {
    if (!email || resendDisabled) return;
    setResending(true);
    setResendError(null);
    setResendOk(false);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.error) {
        setResendError(data.error || "Failed to resend code. Please try again.");
      } else {
        setResendOk(true);
        restart();
      }
    } catch {
      setResendError("Could not reach the server. Please try again in a moment.");
    }
    setResending(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
              <Image src="/rmclogo.jpg" alt="Regis Marie College" width={40} height={40} className="rounded-lg" />
            </div>
            <h1 className="text-xl font-bold text-brand-900">Enter Reset Code</h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}

            <div>
              <label className="label">6-Digit Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                className="input text-center text-2xl tracking-[0.5em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
              />
            </div>

            <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full">
              {loading ? "Verifying…" : "Verify Code"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-500">
            {resendOk && (
              <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                A new code was sent to your email.
              </p>
            )}
            {resendError && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{resendError}</p>
            )}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendDisabled}
              className="font-semibold text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:no-underline"
            >
              {resending ? "Sending..." : resendDisabled ? `Resend in ${timer}s` : "Resend Code"}
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-slate-500">
            <Link href="/auth/forgot-password" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline">
              <ArrowLeft className="h-3 w-3" /> Use a different email
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
