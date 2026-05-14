"use client";

import { useState, useEffect, useCallback } from "react";
import type { Notification } from "@/lib/kanban";
import { apiFetch } from "@/lib/api";

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiFetch<{ notifications: Notification[] }>("/api/notifications");
      setNotifications(data.notifications);
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<{ notifications: Notification[] }>("/api/notifications");
        setNotifications(data.notifications);
      } catch { /* ignore */ }
    }
    load();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: 1 } : n))
      );
    } catch {
      // Silent fail
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch("/api/notifications/read-all", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
    } catch {
      // Silent fail
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchNotifications(); }}
        className="relative flex items-center justify-center rounded-full p-2 text-[var(--gray-text)] transition hover:bg-gray-100 hover:text-[var(--dark-teal)]"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 1.5a5 5 0 00-5 5v3l-1.5 2h13L14 9.5v-3a5 5 0 00-5-5zM7 14a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-[var(--stroke)] bg-white shadow-2xl z-50">
          <div className="flex items-center justify-between border-b border-[var(--stroke)] px-4 py-3">
            <h4 className="text-sm font-semibold text-[var(--dark-teal)]">Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-[var(--accent-turquoise)] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-[var(--gray-text)]">No notifications</p>
            )}
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-start gap-3 border-b border-[var(--stroke)] px-4 py-3 transition hover:bg-gray-50 ${
                  !notif.read ? "bg-[var(--accent-turquoise)]/5" : ""
                }`}
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-turquoise)]/10 text-[10px] font-bold text-[var(--accent-turquoise)]">
                  {notif.action[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--dark-teal)]">
                    <span className="font-medium">{notif.action}</span>
                    {notif.details && <span className="text-[var(--gray-text)]"> — {notif.details}</span>}
                  </p>
                  <p className="text-[10px] text-[var(--gray-text)]">{notif.board_title} &middot; {notif.created_at.slice(0, 16)}</p>
                </div>
                {!notif.read && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="shrink-0 rounded p-1 text-[var(--gray-text)] transition hover:bg-gray-200"
                    aria-label="Mark as read"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
