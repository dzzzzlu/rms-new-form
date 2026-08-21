"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
    })();
  }, []);

  if (!profile) return <div className="card text-sm text-slate-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold text-brand-900">My Profile</h2>
        <p className="mt-1 text-sm text-slate-500">Contact the administrator to update your profile information.</p>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input className="input bg-slate-50" value={profile.full_name ?? ""} disabled />
        </div>
        <div>
          <label className="label">Student Number</label>
          <input className="input bg-slate-50" value={profile.student_number ?? ""} disabled />
        </div>
        <div>
          <label className="label">Course</label>
          <input className="input bg-slate-50" value={profile.course ?? ""} disabled />
        </div>
        <div>
          <label className="label">Contact Number</label>
          <input className="input bg-slate-50" value={profile.contact_number ?? ""} disabled />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input bg-slate-50" value={profile.email ?? ""} disabled />
        </div>
        <div>
          <label className="label">Role</label>
          <input className="input bg-slate-50 capitalize" value={profile.role ?? ""} disabled />
        </div>
      </div>
    </div>
  );
}
