"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  PlusCircle,
  Clock,
  User,
  FileText,
  CreditCard,
  BarChart3,
  Users,
  Upload,
  ClipboardCheck,
  MessageSquare,
  UserCheck,
  LogOut,
  X,
} from "lucide-react";
import Image from "next/image";
import { titleCaseName } from "@/lib/validation";

type Role = "student" | "registrar" | "admin" | "guidance";

const NAV: Record<Role, { label: string; href: string; icon: LucideIcon }[]> = {
  student: [
    { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "New Request", href: "/student/new-request", icon: PlusCircle },
    { label: "My History", href: "/student/history", icon: Clock },
    { label: "My Payments", href: "/student/payments", icon: CreditCard },
    { label: "Messages", href: "/student/messages", icon: MessageSquare },
    { label: "My Profile", href: "/student/profile", icon: User },
  ],
  registrar: [
    { label: "Dashboard", href: "/registrar/dashboard", icon: LayoutDashboard },
    { label: "Manage Requests", href: "/registrar/requests", icon: FileText },
    { label: "Verify Payments", href: "/registrar/payments", icon: CreditCard },
    { label: "Analytics", href: "/registrar/analytics", icon: BarChart3 },
    { label: "Messages", href: "/registrar/messages", icon: MessageSquare },
    { label: "Reports", href: "/registrar/reports", icon: BarChart3 },
  ],
  admin: [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Pending Approvals", href: "/admin/approvals", icon: UserCheck },
    { label: "Manage Users", href: "/admin/users", icon: Users },
    { label: "Import Past Records", href: "/admin/import-records", icon: Upload },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Messages", href: "/admin/messages", icon: MessageSquare },
    { label: "Reports", href: "/admin/reports", icon: FileText },
  ],
  guidance: [
    { label: "Dashboard", href: "/guidance/dashboard", icon: LayoutDashboard },
    { label: "Good Moral Approvals", href: "/guidance/approvals", icon: ClipboardCheck },
    { label: "Analytics", href: "/guidance/analytics", icon: BarChart3 },
    { label: "Messages", href: "/guidance/messages", icon: MessageSquare },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  student: "Student / Alumni",
  registrar: "Registrar Office",
  admin: "System Administrator",
  guidance: "Guidance Department",
};

export default function Sidebar({
  role,
  fullName,
  userId,
  open,
  onClose,
}: {
  role: Role;
  fullName: string;
  userId: string;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function fetchUnread() {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("is_read", false);
      if (mounted) setUnreadCount(count ?? 0);
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    const onRead = () => fetchUnread();
    window.addEventListener("messages-read", onRead);
    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener("messages-read", onRead);
    };
  }, [userId, pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 transition-opacity lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col
          bg-gradient-to-b from-brand-950 via-brand-900 to-brand-700 text-white shadow-sidebar
          transition-transform duration-300 ease-in-out lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <Image src="/rmclogo.jpg" alt="Regis Marie College" width={28} height={28} className="rounded-md" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">Regis Marie College</p>
                <p className="text-[11px] text-brand-200">Document Request System</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-brand-200 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <span className="mt-3 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-100">
            {ROLE_LABEL[role]}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-brand-300">
            Main Menu
          </p>
          <ul className="space-y-1">
            {NAV[role].map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                      ${
                        active
                          ? "bg-white/15 text-white shadow-inner"
                          : "text-brand-100 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.label === "Messages" && unreadCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <p className="truncate text-sm font-semibold text-white">{titleCaseName(fullName)}</p>
          <p className="mb-3 text-xs text-brand-200">{ROLE_LABEL[role]}</p>
          <button
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white/10 text-sm font-semibold text-white transition-colors hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
