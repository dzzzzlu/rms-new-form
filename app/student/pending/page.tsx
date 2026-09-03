"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Clock, LogOut } from "lucide-react";

export default function PendingApprovalPage() {
  const supabase = createClient();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-brand-900">Account Pending Approval</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your account has been created and is awaiting approval from the system administrator.
            You will be able to access the system once your account is approved.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            This usually takes within 24 hours. If you need immediate assistance, please contact
            the registrar&apos;s office.
          </p>
          <button
            onClick={handleLogout}
            className="btn-outline mx-auto mt-6 flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </main>
  );
}
