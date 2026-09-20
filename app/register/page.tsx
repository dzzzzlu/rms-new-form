"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronDown, ChevronLeft, ChevronRight, FileText, Loader2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import {
  validateNamePart,
  validateEmail,
  validatePassword,
  validateStudentNumber,
  validateContactNumber,
  titleCaseName,
} from "@/lib/validation";

const DOC_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const DOC_MAX_BYTES = 5 * 1024 * 1024;
const DOC_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const COURSES = [
  "BS Computer Science",
  "BS Accountancy",
  "BS Business Administration",
  "BS Education",
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
  const [checking, setChecking] = useState(false);
  const [linkPrompt, setLinkPrompt] = useState<null | {
    count: number;
    records: Array<{
      id: number;
      tracking_code: string;
      document_name: string | null;
      course: string | null;
      copies: number;
      record_date: string | null;
    }>;
  }>(null);
  const [doc, setDoc] = useState<{ path: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  function update(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setDocError(null);

    if (!DOC_ALLOWED_TYPES.includes(file.type)) {
      setDocError("Please upload a JPG, PNG, WEBP, or PDF file.");
      return;
    }
    if (file.size > DOC_MAX_BYTES) {
      setDocError("File is too large. Maximum size is 5 MB.");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const prefix = (form.last_name || "document").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const path = `${prefix}-${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("verification-docs")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadErr) {
      setDocError("Upload failed. Please try again.");
      setUploading(false);
      return;
    }

    setDoc({ path, name: file.name });
    setUploading(false);
  }

  function clearDoc() {
    setDoc(null);
    setDocError(null);
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
    if (!doc) return "Please upload your School ID, Registration Form, or COR.";
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

    if (linkPrompt) return;

    // Before creating the account, check for unlinked historical records under
    // this email or student number. If any exist the student gets an explicit
    // choice (never an automatic link) right here during registration.
    setChecking(true);
    try {
      const res = await fetch("/api/records/unlinked-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, student_number: form.student_number.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      const count = res.ok ? Number(data.count ?? 0) : 0;
      setChecking(false);
      if (count > 0) {
        setLinkPrompt({ count, records: data.records ?? [] });
        return;
      }
    } catch {
      setChecking(false);
      // If the match lookup fails for any reason, registration continues
      // normally without the prompt.
    }

    await proceedSubmit(false);
  }

  async function proceedSubmit(linkRecords: boolean) {
    setError(null);
    setLinkPrompt(null);
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
        verification_doc_path: doc?.path ?? null,
        verification_doc_name: doc?.name ?? null,
        link_records: linkRecords,
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
                <PasswordInput
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
                <PasswordInput
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

              <div>
                <label className="label">Verification Document</label>
                <p className="mb-2 text-xs leading-relaxed text-slate-500">
                  Upload your <strong>School ID</strong>, <strong>Registration Form</strong>, or{" "}
                  <strong>COR</strong> so the registrar can verify your identity. Accepts JPG, PNG,
                  WEBP, or PDF — max 5 MB.
                </p>

                {doc ? (
                  <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <FileText className="h-5 w-5 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">{doc.name}</p>
                      <p className="text-xs text-emerald-600">Uploaded successfully</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearDoc}
                      aria-label="Remove uploaded document"
                      className="shrink-0 text-slate-400 transition-colors hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-4 text-sm transition-colors ${
                      uploading
                        ? "cursor-wait border-brand-300 bg-brand-50 text-brand-600"
                        : "border-slate-300 text-slate-500 hover:border-brand-400 hover:bg-brand-50"
                    }`}
                  >
                    <input
                      type="file"
                      accept={DOC_ACCEPT}
                      className="hidden"
                      onChange={onFileChange}
                      disabled={uploading}
                    />
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Choose file
                      </>
                    )}
                  </label>
                )}

                {docError && <p className="mt-1.5 text-xs text-red-600">{docError}</p>}
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
                <button type="submit" disabled={loading || checking} className="btn-primary flex-1">
                  {checking ? "Checking for past records…" : loading ? "Creating account…" : "Create Account"}
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

        {linkPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card w-full max-w-md space-y-4">
              <h3 className="text-lg font-bold text-brand-900">Past records found</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                We found{" "}
                <strong className="text-slate-900">
                  {linkPrompt.count} past document request record
                  {linkPrompt.count === 1 ? "" : "s"}
                </strong>{" "}
                under this email or student number. Would you like to link them to your new account?
              </p>
              <ul className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-slate-100 p-2.5">
                {linkPrompt.records.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="min-w-0 truncate font-medium text-slate-800">
                      {r.document_name ?? "Unknown document"}
                    </span>
                    <span className="shrink-0 text-slate-500">
                      {r.record_date
                        ? new Date(r.record_date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : r.copies > 1
                        ? `${r.copies} copies`
                        : ""}
                    </span>
                  </li>
                ))}
                {linkPrompt.count > linkPrompt.records.slice(0, 5).length && (
                  <li className="text-xs text-slate-400">
                    + {linkPrompt.count - linkPrompt.records.slice(0, 5).length} more record
                    {linkPrompt.count - linkPrompt.records.slice(0, 5).length === 1 ? "" : "s"}…
                  </li>
                )}
              </ul>
              <p className="text-xs text-slate-400">
                This only adds earlier records to your account history — it creates no payment
                obligations. You can also do this later from your profile settings.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => proceedSubmit(true)}
                  className="btn-primary flex-1"
                >
                  Yes, link my records
                </button>
                <button
                  type="button"
                  onClick={() => proceedSubmit(false)}
                  className="btn-outline flex-1"
                >
                  No, skip this
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}