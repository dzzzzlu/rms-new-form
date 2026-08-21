"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    if (!email) return;
    const interval = setInterval(() => setTimer((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [email]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!email || code.length !== 6) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Invalid code.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      toast.success("Email verified! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      toast.error("Something went wrong.");
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email || timer > 0) return;
    setResending(true);

    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        toast.success("New code sent!");
        setTimer(60);
      } else {
        toast.error("Failed to resend code.");
      }
    } catch {
      toast.error("Something went wrong.");
    }
    setResending(false);
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="card max-w-md text-center">
          <p className="text-slate-600 mb-4">No email provided.</p>
          <Link href="/register" className="text-blue-600 hover:underline">
            Back to Registration
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="card max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Email Verified!</h2>
          <p className="text-slate-500">Redirecting you to the login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
      <div className="card max-w-md w-full text-center space-y-6">
        <div className="flex flex-col items-center">
          <img src="/logo.png" alt="Regis Marie College" className="h-16 mb-3" />
          <h1 className="text-2xl font-bold text-slate-800">Verify Your Email</h1>
          <p className="text-sm text-slate-500 mt-1">
            We sent a 6-digit code to <strong className="text-slate-700">{email}</strong>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Enter Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="input w-full text-center text-2xl tracking-[8px] font-mono"
              autoFocus
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="btn-primary w-full"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <div className="text-sm text-slate-500">
          {timer > 0 ? (
            <p>Resend code in {timer}s</p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-blue-600 hover:underline font-medium"
            >
              {resending ? "Sending..." : "Resend Code"}
            </button>
          )}
        </div>

        <Link href="/register" className="block text-sm text-slate-400 hover:text-slate-600">
          Back to Registration
        </Link>
      </div>
    </div>
  );
}
