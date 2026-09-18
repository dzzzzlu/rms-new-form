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
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  function handleRefresh() {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    window.setTimeout(() => setRefreshing(false), 700);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role={role} fullName={fullName} userId={userId} open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <Topbar
          title={title}
          userId={userId}
          role={role}
          onMenuClick={() => setOpen((o) => !o)}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
        <main key={refreshKey} className="p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
