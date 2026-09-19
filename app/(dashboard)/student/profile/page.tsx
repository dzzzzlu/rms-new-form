"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  KeyRound,
  Mail,
  Phone,
  ScrollText,
  ShieldCheck,
  UserCircle2,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import type { Profile, Request } from "@/lib/types";
import { validateContactNumber, titleCaseName } from "@/lib/validation";

const STATUS_COLOR: Record<string, string> = {
  Pending: "bg-slate-100 text-slate-700",
  "Payment Verification": "bg-amber-50 text-amber-700",
  Processing: "bg-brand-50 text-brand-700",
  "Ready for Pickup": "bg-indigo-50 text-indigo-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
  Cancelled: "bg-slate-100 text-slate-600",
};

type HistoryItem = {
  id: number;
  tracking_code: string;
  status: Request["status"];
  pickup_at: string | null;
  created_at: string;
  documents: { name: string } | null;
};

function displayName(p: Profile): string {
  const parts = [p.first_name, p.middle_name, p.last_name]
    .filter(Boolean)
    .map((s) => titleCaseName(String(s)))
    .filter(Boolean);
  return parts.length ? parts.join(" ") : titleCaseName(p.full_name);
}

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mobile, setMobile] = useState("");
  const [savingMobile, setSavingMobile] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailStep, setEmailStep] = useState<"idle" | "code">("idle");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [prefs, setPrefs] = useState({ email_alerts: true, pickup_reminders: true });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data as Profile);
        setMobile(data.contact_number ?? "");
        setNewEmail(data.email ?? "");
        const prefs = (data.notification_prefs ?? {}) as Profile["notification_prefs"];
        setPrefs({
          email_alerts: prefs.email_alerts ?? true,
          pickup_reminders: prefs.pickup_reminders ?? true,
        });
      }

      const { data: reqs } = await supabase
        .from("requests")
        .select("id, tracking_code, status, pickup_at, created_at, documents(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setHistory((reqs as unknown as HistoryItem[]) ?? []);
    })();
  }, []);

  if (!profile) return <div className="card text-sm text-slate-500">Loading…</div>;

  async function saveMobile() {
    if (!profile) return;
    const err = validateContactNumber(mobile);
    if (err) return toast.error(err);
    setSavingMobile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ contact_number: mobile.trim() })
      .eq("id", profile.id);
    setSavingMobile(false);
    if (error) return toast.error("Failed to save mobile number.");
    setProfile({ ...profile, contact_number: mobile.trim() });
    toast.success("Mobile number updated.");
  }

  async function savePrefs(key: "email_alerts" | "pickup_reminders", value: boolean) {
    if (!profile) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const { error } = await supabase
      .from("profiles")
      .update({ notification_prefs: next })
      .eq("id", profile.id);
    if (error) toast.error("Failed to save notification preferences.");
    else toast.success("Notification preferences saved.");
  }

  async function sendEmailCode() {
    if (!profile) return;
    if (!newEmail.trim() || newEmail === profile.email) {
      return toast.error("Enter a new email address first.");
    }
    setEmailError(null);
    setSendingEmail(true);
    const res = await fetch("/api/auth/change-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", new_email: newEmail.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSendingEmail(false);
      setEmailError(data.error ?? "Could not send the verification code.");
      return toast.error(data.error ?? "Could not send the verification code.");
    }
    setSendingEmail(false);
    setEmailStep("code");
    toast.success("Code sent to the new address.");
  }

  async function confirmEmailCode() {
    if (!profile) return;
    if (emailCode.length !== 6) return;
    setEmailError(null);
    const res = await fetch("/api/auth/change-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "confirm",
        new_email: newEmail.trim(),
        code: emailCode,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setEmailError(data.error ?? "Could not verify the code.");
      return toast.error(data.error ?? "Could not verify the code.");
    }
    setProfile({ ...profile, email: newEmail.trim() });
    setEmailStep("idle");
    setEmailCode("");
    toast.success("Email address updated.");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) return toast.error("New password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match.");
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) return toast.error(error.message === "Auth session missing!" ? "Please sign in again, then retry." : error.message);
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated.");
  }

  const status =
    !profile.is_active ? "pending" : !profile.email_verified ? "unverified" : "active";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Account status */}
      {status === "pending" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-800">Your account is awaiting approval.</p>
            <p className="text-sm text-amber-700">
              Submitted {new Date(profile.created_at).toLocaleDateString()}. A registrar admin will
              review your registration against school records — you&apos;ll receive an email once
              approved.
            </p>
          </div>
        </div>
      )}
      {status === "unverified" && (
        <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <div>
            <p className="font-semibold text-brand-800">Your email isn&apos;t verified yet.</p>
            <p className="text-sm text-brand-700">Check your inbox for your verification code.</p>
          </div>
        </div>
      )}
      {status === "active" && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-800">Account active</p>
            <p className="text-sm text-emerald-700">
              {profile.last_login_at
                ? `Last signed in ${new Date(profile.last_login_at).toLocaleString("en-PH")}.`
                : "You can now request documents and track them here."}
            </p>
          </div>
        </div>
      )}

      {/* Zone 1 — read-only school record */}
      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-bold text-brand-900">School Record</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Full Name</label>
            <input className="input bg-slate-50 font-medium" value={displayName(profile)} disabled />
          </div>
          <div>
            <label className="label">Student Number</label>
            <input className="input bg-slate-50" value={profile.student_number ?? "—"} disabled />
          </div>
          <div>
            <label className="label">Course</label>
            <input className="input bg-slate-50" value={profile.course ?? "—"} disabled />
          </div>
          <div>
            <label className="label">Year Level</label>
            <input
              className="input bg-slate-50"
              value={profile.year_level || "—"}
              disabled
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Enrollment Status</label>
            <input className="input bg-slate-50" value={profile.enrollment_status} disabled />
          </div>
        </div>
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          These details come from your school record — contact the Registrar&apos;s Office to
          correct them.
        </p>
      </div>

      {/* Zone 2 — editable contact + preferences */}
      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <UserCircle2 className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-bold text-brand-900">Contact &amp; Notifications</h2>
        </div>
        <div className="space-y-5">
          <div>
            <label className="label">Mobile Number</label>
            <div className="flex gap-2">
              <input
                className="input"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="09XX XXX XXXX"
              />
              <button onClick={saveMobile} disabled={savingMobile} className="btn-primary shrink-0">
                {savingMobile ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          <div>
            <label className="label flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" /> Email (login)
            </label>
            <p className="mb-2 text-xs text-slate-400">Changing your email requires a code sent to the new address.</p>
            {emailStep !== "idle" ? (
              <div className="space-y-2 rounded-lg border border-brand-100 bg-brand-50/50 p-3">
                <p className="text-sm text-brand-700">
                  A 6-digit code was sent to <strong>{newEmail}</strong>.
                </p>
                <div className="flex gap-2">
                  <input
                    className="input font-mono tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                  />
                  <button onClick={confirmEmailCode} disabled={emailCode.length !== 6} className="btn-primary shrink-0">
                    Verify
                  </button>
                </div>
                {emailError && <p className="text-xs text-red-600">{emailError}</p>}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  className="input"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <button
                  onClick={sendEmailCode}
                  disabled={sendingEmail || !newEmail.trim() || newEmail === profile.email}
                  className="btn-outline shrink-0"
                >
                  {sendingEmail ? "Sending…" : "Update Email"}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="label mb-2">Notification Preferences</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={prefs.email_alerts}
                  onChange={(e) => savePrefs("email_alerts", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                />
                Email alerts for request updates
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={prefs.pickup_reminders}
                  onChange={(e) => savePrefs("pickup_reminders", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                />
                Pickup reminders when documents are ready
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-400">
                <input type="checkbox" disabled className="h-4 w-4 rounded border-slate-300" />
                SMS reminders <span className="text-xs">(coming soon)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Zone 3 — account & security */}
      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-bold text-brand-900">Account &amp; Security</h2>
        </div>
        <form onSubmit={changePassword} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label className="label">New Password</label>
            <PasswordInput
              required
              minLength={8}
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <PasswordInput
              required
              minLength={8}
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={changingPassword} className="btn-primary shrink-0">
            <KeyRound className="mr-1 inline h-4 w-4" />
            {changingPassword ? "Saving…" : "Change"}
          </button>
        </form>
      </div>

      {/* Recent requests */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-500" />
            <h2 className="text-lg font-bold text-brand-900">Recent Requests</h2>
          </div>
          <Link href="/student/history" className="text-sm font-medium text-brand-600 hover:underline">
            View full history →
          </Link>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">No requests yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((r) => (
              <Link
                key={r.id}
                href={`/student/requests/${r.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2.5 hover:border-brand-200 hover:bg-brand-50/40"
              >
                <div>
                  <p className="text-sm font-medium text-brand-900">{r.documents?.name}</p>
                  <p className="text-xs text-slate-500">
                    {r.tracking_code} · {new Date(r.created_at).toLocaleDateString()}
                    {r.pickup_at
                      ? ` · Pickup ${new Date(r.pickup_at).toLocaleDateString("en-PH")}`
                      : ""}
                  </p>
                </div>
                <span className={`badge ${STATUS_COLOR[r.status] ?? "bg-slate-100 text-slate-700"}`}>
                  {r.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}