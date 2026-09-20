"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";

type Notification = {
  id: number;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
  request_id: number | null;
};

export default function NotificationBell({ userId, role }: { userId: string; role: "student" | "registrar" | "admin" | "guidance" }) {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const visible = notifications.filter(
    (n) => !(role === "admin" || role === "guidance") || !n.message.startsWith("New document request:")
  );
  const unreadCount = visible.filter((n) => !n.is_read).length;

  async function load() {
    const { data } = await supabase
      .from("notifications")
      .select("id, message, link, is_read, created_at, request_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data ?? []);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAsRead(id: number) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  function openNotification(n: Notification) {
    setOpen(false);
    if (!n.is_read) markAsRead(n.id);
  }

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unread.map((n) => n.id));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg text-brand-500 transition hover:bg-brand-50 hover:text-brand-700"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-brand-100 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-brand-900">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto sm:max-h-96">
            {visible.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet.</p>
            ) : (
              visible.map((n) =>
                n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => openNotification(n)}
                    className={`flex w-full items-center justify-between gap-2 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-brand-50 ${
                      !n.is_read ? "bg-brand-50/50" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className={`block text-sm ${!n.is_read ? "font-medium text-brand-900" : "text-slate-600"}`}>
                        {n.message}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400">{timeAgo(n.created_at)}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-brand-300" />
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    onClick={() => openNotification(n)}
                    className={`flex w-full items-center justify-between gap-2 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-brand-50 ${
                      !n.is_read ? "bg-brand-50/50" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className={`block text-sm ${!n.is_read ? "font-medium text-brand-900" : "text-slate-600"}`}>
                        {n.message}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                )
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
