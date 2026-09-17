"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  validateNamePart,
  validateEmail,
  validatePassword,
  validateStudentNumber,
  validateContactNumber,
  titleCaseName,
} from "@/lib/validation";

const COURSES = [
  "BS Computer Science",
  "BS Accountancy",
  "BS Business Administration",
  "AB Education",
];

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];

const ENROLLMENT_STATUSES = [
  "Currently Enrolled",
  "On Leave",
  "Graduated",
  "Alumni",
];

const STEPS = ["Account", "Student Details"];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm_password: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    student_number: "",
    course: "",
    year_level: "",
    enrollment_status: "" as string,
    contact_number: "",
    consent: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validateStep1(): string | null {
    const emailErr = validateEmail(form.email);
    if (emailErr) return emailErr;
    const passErr = validatePassword(form.password);
    if (passErr) return passErr;
    if (form.password !== form.confirm_password) return "Passwords do not match.";
    return null;
  }

  function validateStep2(): string | null {
    const lastErr = validateNamePart(form.last_name, "Last name");
    if (lastErr) return lastErr;
    const firstErr = validateNamePart(form.first_name, "First name");
    if (firstErr) return firstErr;
    if (form.middle_name) {
      const midErr = validateNamePart(form.middle_name, "Middle name");
      if (midErr) return midErr;
    }
    const snErr = validateStudentNumber(form.student_number);
    if (snErr) return snErr;
    if (!form.course) return "Please select your course.";
    if (!form.enrollment_status) return "Please select your enrollment status.";
    if (form.enrollment_status === "Currently Enrolled" && !form.year_level) {
      return "Please select your year level.";
    }
    const phoneErr = validateContactNumber(form.contact_number);
    if (phoneErr) return phoneErr;
    if (!form.consent) return "Please accept the Data Privacy notice to continue.";
    return null;
  }

  function next() {
    setError(null);
    const err = step === 1 ? validateStep1() : validateStep2();
    if (err) {
      setError(err);
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setError(null);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const err = validateStep2();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);

    const firstName = titleCaseName(form.first_name);
    const middleName = titleCaseName(form.middle_name);
    const lastName = titleCaseName(form.last_name);
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
    const isAlumni = form.enrollment_status === "Graduated" || form.enrollment_status === "Alumni";

    let sendErrorMsg = "";
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        sendErrorMsg = data.error || "Unknown error";
      }
    } catch {
      sendErrorMsg = "Could not reach the server.";
    }

    // Do NOT create the account yet. The email has to be verified first, so the
    // address is never "taken" before the user proves they own it. The details
    // stay on this device and the real account is only created after the
    // 6-digit code is confirmed on the verify page.
    sessionStorage.setItem(
      "pending_signup",
      JSON.stringify({
        email: form.email,
        password: form.password,
        full_name: fullName,
        last_name: lastName,
        first_name: firstName,
        middle_name: middleName,
        student_number: form.student_number.trim(),
        course: form.course,
        year_level: form.year_level,
        enrollment_status: form.enrollment_status,
        contact_number: form.contact_number.trim(),
        is_alumni: isAlumni,
      })
    );

    setLoading(false);
    const params = new URLSearchParams({ email: form.email });
    if (sendErrorMsg) {
      params.set("sendError", "1");
      params.set("err", sendErrorMsg);
    }
    router.push(`/auth/verify-email?${params.toString()}`);
  }

  const enrolledOnly = form.enrollment_status === "Currently Enrolled";

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-4 py-10">
      {/* background watermark */}
      <div
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat bg-contain opacity-[0.05]"
        style={{ backgroundImage: "url('/wildd.jpg')" }}
      />
      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-6 text-center text-white">
          <h1 className="text-xl font-bold">Create your Student / Alumni account</h1>
          <p className="text-sm text-brand-100">Regis Marie College Document Request System</p>
        </div>

        {/* step indicator */}
        <ol className="mb-5 flex items-center justify-center gap-2">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    active
                      ? "bg-gold text-brand-950"
                      : done
                      ? "bg-emerald-400 text-emerald-950"
                      : "bg-white/15 text-white"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : n}
                </span>
                <span
                  className={`text-xs font-medium ${
                    active ? "text-white" : done ? "text-emerald-200" : "text-brand-200"
                  }`}
                >
                  {label}
                </span>
                {n < STEPS.length && <span className="mx-1 h-px w-6 bg-white/25" />}
              </li>
            );
          })}
        </ol>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-7 shadow-2xl">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  required
                  className="input"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@regismarie.edu.ph"
                />
                <p className="mt-1 text-xs text-slate-400">
                  This will be your login. You&apos;ll confirm it with a 6-digit code before your
                  account is queued for approval.
                </p>
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="input"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">
                  At least 8 characters with 1 letter and 1 number.
                </p>
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="input"
                  value={form.confirm_password}
                  onChange={(e) => update("confirm_password", e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Last Name</label>
                  <input
                    required
                    className="input"
                    value={form.last_name}
                    onChange={(e) => update("last_name", e.target.value)}
                    placeholder="Dela Cruz"
                  />
                </div>
                <div>
                  <label className="label">First Name</label>
                  <input
                    required
                    className="input"
                    value={form.first_name}
                    onChange={(e) => update("first_name", e.target.value)}
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="label">Middle Name</label>
                  <input
                    className="input"
                    value={form.middle_name}
                    onChange={(e) => update("middle_name", e.target.value)}
                    placeholder="Santos"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Student Number</label>
                  <input
                    className="input"
                    value={form.student_number}
                    onChange={(e) => update("student_number", e.target.value)}
                    placeholder="2023156251"
                  />
                </div>
                <div>
                  <label className="label">Course</label>
                  <div className="relative">
                    <select
                      required
                      className="input cursor-pointer appearance-none pr-9"
                      value={form.course}
                      onChange={(e) => update("course", e.target.value)}
                    >
                      <option value="">Select course…</option>
                      {COURSES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Enrollment Status</label>
                  <div className="relative">
                    <select
                      required
                      className="input cursor-pointer appearance-none pr-9"
                      value={form.enrollment_status}
                      onChange={(e) => update("enrollment_status", e.target.value)}
                    >
                      <option value="">Select status…</option>
                      {ENROLLMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className="label">Year Level</label>
                  <div className="relative">
                    <select
                      className="input cursor-pointer appearance-none pr-9 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                      disabled={!enrolledOnly}
                      value={enrolledOnly ? form.year_level : ""}
                      onChange={(e) => update("year_level", e.target.value)}
                    >
                      <option value="">
                        {enrolledOnly ? "Select year level…" : "Not applicable"}
                      </option>
                      {YEAR_LEVELS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Mobile Number</label>
                <input
                  className="input"
                  value={form.contact_number}
                  onChange={(e) => update("contact_number", e.target.value)}
                  placeholder="09XX XXX XXXX"
                />
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  Used for pickup reminders when your documents are ready.
                </p>
              </div>

              <label className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => update("consent", e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-brand-500"
                />
                <span className="text-[13px] leading-relaxed text-slate-600">
                  I consent to Regis Marie College collecting and processing the personal
                  information I provide here and on my document requests, in line with the{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-900"
                  >
                    Data Privacy notice
                  </Link>
                  .
                </span>
              </label>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            {step === 2 ? (
              <>
                <button
                  type="button"
                  onClick={back}
                  disabled={loading}
                  className="btn-outline flex-none px-5"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Creating account…" : "Create Account"}
                </button>
              </>
            ) : (
              <button type="button" onClick={next} className="btn-primary ml-auto">
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

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