"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const sendError = searchParams.get("sendError") === "1";
  const sendErrorMsg = searchParams.get("err");

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [timer, setTimer] = useState(10);
  const [resendError, setResendError] = useState<string | null>(null);

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
      const body: Record<string, unknown> = { email, code };

      // Two-phase registration: the details were kept on this device by the
      // register page and are only handed to the server once the code is right.
      try {
        const pending = sessionStorage.getItem("pending_signup");
        if (pending) {
          const p = JSON.parse(pending) as Record<string, unknown>;
          if (p.email === email) {
            Object.assign(body, {
              password: p.password ?? "",
              full_name: p.full_name ?? "",
              last_name: p.last_name ?? "",
              first_name: p.first_name ?? "",
              middle_name: p.middle_name ?? "",
              student_number: p.student_number ?? "",
              course: p.course ?? "",
              year_level: p.year_level ?? "",
              enrollment_status: p.enrollment_status ?? "",
              contact_number: p.contact_number ?? "",
              is_alumni: Boolean(p.is_alumni),
            });
          }
        }
      } catch {
        // ignore malformed pending data
      }

      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Invalid code.");
        setLoading(false);
        return;
      }

      sessionStorage.removeItem("pending_signup");
      setSuccess(true);
      toast.success("Email verified!");
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
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("New code sent!");
        setTimer(10);
        setResendError(null);
      } else {
        setResendError(data.error || "Failed to resend code.");
        toast.error(data.error || "Failed to resend code.");
      }
    } catch {
      setResendError("Could not reach the server. Please try again in a moment.");
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
          <p className="text-sm text-slate-600">Your account is now waiting for approval.</p>
          <p className="text-xs text-slate-400">
            A registrar admin will review your registration — you&#39;ll receive an email once your account is approved.
          </p>
          <p className="text-base">
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
      <div className="card max-w-md w-full text-center space-y-6">
        <div className="flex flex-col items-center">
          <img src="/rmclogo.jpg" alt="Regis Marie College" className="h-16 mb-3" />
          <h1 className="text-2xl font-bold text-slate-800">Verify Your Email</h1>
          <p className="text-sm text-slate-500 mt-1">
            We sent a 6-digit code to <strong className="text-slate-700">{email}</strong>
          </p>
        </div>

        {sendError && (
          <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
            We couldn't send the code automatically.
            {sendErrorMsg ? (
              <>
                {" "}Reason: <span className="font-mono text-xs">{sendErrorMsg}</span>
              </>
            ) : null}{" "}
            Use <strong>Resend Code</strong> below once it's available.
          </div>
        )}

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
          {resendError && (
            <p className="mt-2 break-all text-xs text-red-600">
              Could not send the code: <span className="font-mono">{resendError}</span>
            </p>
          )}
        </div>

        <Link href="/register" className="block text-sm text-slate-400 hover:text-slate-600">
          Back to Registration
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-400">Loading...</p></div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
