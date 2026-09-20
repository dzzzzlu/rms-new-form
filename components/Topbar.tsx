"use client";

import { Menu, RefreshCw } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function Topbar({
  title,
  userId,
  role,
  onMenuClick,
  onRefresh,
  refreshing,
}: {
  title: string;
  userId: string;
  role: "student" | "registrar" | "admin" | "guidance";
  onMenuClick: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-brand-100 bg-white/90 px-3 py-2.5 backdrop-blur sm:px-5 sm:py-3.5">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-brand-100 text-brand-700 transition-colors hover:bg-brand-50 lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold text-brand-900 sm:text-lg">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-brand-100 text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-wait"
          aria-label="Refresh this page"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
        <NotificationBell userId={userId} role={role} />
      </div>
    </header>
  );
}
