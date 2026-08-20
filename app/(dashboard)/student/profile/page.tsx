"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { validateFullName, validateStudentNumber, validateContactNumber } from "@/lib/validation";
import { toast } from "sonner";

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const nameErr = validateFullName(profile?.full_name ?? "");
    if (nameErr) { setError(nameErr); return; }
    const snErr = validateStudentNumber(profile?.student_number ?? "");
    if (snErr) { setError(snErr); return; }
    const phoneErr = validateContactNumber(profile?.contact_number ?? "");
    if (phoneErr) { setError(phoneErr); return; }

    setSaving(true);
    const { error: saveErr } = await supabase
      .from("profiles")
      .update({
        full_name: profile!.full_name,
        student_number: profile!.student_number,
        course: profile!.course,
        contact_number: profile!.contact_number,
      })
      .eq("id", profile!.id);
    setSaving(false);

    if (saveErr) {
      toast.error("Failed to save profile.");
      return;
    }
    toast.success("Profile updated.");
  }

  if (!profile) return <div className="card text-sm text-slate-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">My Profile</h2>
      </div>

      <form onSubmit={handleSave} className="card space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}
        <div>
          <label className="label">Full Name</label>
          <input
            className="input"
            value={profile.full_name ?? ""}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Student Number</label>
          <input
            className="input"
            value={profile.student_number ?? ""}
            onChange={(e) => setProfile({ ...profile, student_number: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Course</label>
          <input
            className="input"
            value={profile.course ?? ""}
            onChange={(e) => setProfile({ ...profile, course: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Contact Number</label>
          <input
            className="input"
            value={profile.contact_number ?? ""}
            onChange={(e) => setProfile({ ...profile, contact_number: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input bg-slate-50" value={profile.email ?? ""} disabled />
          <p className="mt-1 text-xs text-slate-400">Email cannot be changed.</p>
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
