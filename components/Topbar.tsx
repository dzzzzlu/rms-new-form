"use client";

import { Menu } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function Topbar({
  title,
  userId,
  onMenuClick,
}: {
  title: string;
  userId: string;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-brand-100 bg-white/90 px-5 py-3.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg border border-brand-100 p-2 text-brand-700 transition-colors hover:bg-brand-50 lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-brand-900">{title}</h1>
      </div>
      <NotificationBell userId={userId} />
    </header>
  );
}
