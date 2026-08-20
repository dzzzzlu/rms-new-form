"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail } from "lucide-react";
import {
  validateFullName,
  validateEmail,
  validatePassword,
  validateStudentNumber,
  validateContactNumber,
} from "@/lib/validation";

const COURSES = [
  "BS Computer Science",
  "BS Accountancy",
  "BS Business Administration",
  "AB Education",
];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    full_name: "",
    student_number: "",
    course: "",
    contact_number: "",
    email: "",
    password: "",
    confirm_password: "",
    is_alumni: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function update(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const nameErr = validateFullName(form.full_name);
    if (nameErr) { setError(nameErr); return; }
    const emailErr = validateEmail(form.email);
    if (emailErr) { setError(emailErr); return; }
    const passErr = validatePassword(form.password);
    if (passErr) { setError(passErr); return; }
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }
    const snErr = validateStudentNumber(form.student_number);
    if (snErr) { setError(snErr); return; }
    const phoneErr = validateContactNumber(form.contact_number);
    if (phoneErr) { setError(phoneErr); return; }
    if (!form.course) {
      setError("Please select your course.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: {
          full_name: form.full_name,
          student_number: form.student_number,
          course: form.course,
          contact_number: form.contact_number,
          is_alumni: form.is_alumni,
          role: "student",
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
            <Mail className="h-7 w-7 text-brand-600" />
          </div>
          <h2 className="text-lg font-bold text-brand-900">Check your email</h2>
          <p className="mt-2 text-sm text-slate-500">
            We sent a verification link to <span className="font-medium">{form.email}</span>.
            Click it to activate your account, then sign in.
          </p>
          <Link href="/login" className="btn-primary mt-6 inline-flex">
            Go to Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center text-white">
          <h1 className="text-xl font-bold">Create your Student / Alumni account</h1>
          <p className="text-sm text-brand-100">Regis Marie College Document Request System</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-7 shadow-2xl">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full Name</label>
              <input required className="input" value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)} />
            </div>
            <div>
              <label className="label">Student Number</label>
              <input className="input" value={form.student_number}
                onChange={(e) => update("student_number", e.target.value)} />
            </div>
            <div>
              <label className="label">Course</label>
              <select required className="input" value={form.course}
                onChange={(e) => update("course", e.target.value)}>
                <option value="">Select course…</option>
                {COURSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Contact Number</label>
              <input className="input" value={form.contact_number}
                onChange={(e) => update("contact_number", e.target.value)} />
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.is_alumni}
                onChange={(e) => update("is_alumni", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
              />
              I am an alumni (not currently enrolled)
            </label>
          </div>

          <div className="mb-4">
            <label className="label">Email</label>
            <input type="email" required className="input" value={form.email}
              onChange={(e) => update("email", e.target.value)} />
          </div>

          <div className="mb-4">
            <label className="label">Password</label>
            <input type="password" required minLength={8} className="input" value={form.password}
              onChange={(e) => update("password", e.target.value)} />
            <p className="mt-1 text-xs text-slate-400">At least 8 characters with 1 letter and 1 number.</p>
          </div>

          <div className="mb-6">
            <label className="label">Confirm Password</label>
            <input type="password" required minLength={8} className="input" value={form.confirm_password}
              onChange={(e) => update("confirm_password", e.target.value)} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating account…" : "Create Account"}
          </button>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
