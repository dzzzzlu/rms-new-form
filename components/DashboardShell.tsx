"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getPageTitle } from "@/lib/page-titles";

export default function DashboardShell({
  role,
  fullName,
  userId,
  children,
}: {
  role: "student" | "registrar" | "admin" | "guidance";
  fullName: string;
  userId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role={role} fullName={fullName} open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <Topbar title={title} userId={userId} onMenuClick={() => setOpen((o) => !o)} />
        <main className="p-5">{children}</main>
      </div>
    </div>
  );
}
