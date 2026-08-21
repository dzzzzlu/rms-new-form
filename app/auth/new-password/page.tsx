"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

export default function NewPasswordPage() {
  return (
    <Suspense fallback={null}>
      <NewPasswordForm />
    </Suspense>
  );
}

function NewPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!/[a-zA-Z]/.test(password)) return setError("Password must contain at least one letter.");
    if (!/[0-9]/.test(password)) return setError("Password must contain at least one number.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.error) {
      setError(data.error);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
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
            <h1 className="text-xl font-bold text-brand-900">Set New Password</h1>
            <p className="mt-1 text-sm text-slate-500">Choose a strong password for your account.</p>
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-700">
                Password updated! Redirecting to sign in…
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
              )}

              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
                <p className="mt-1 text-xs text-slate-400">At least 8 characters with 1 letter and 1 number.</p>
              </div>

              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Updating…" : "Update Password"}
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
