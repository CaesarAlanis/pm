"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type Profile = {
  username: string;
  created_at: string;
  board_count: number;
};

type UserProfileProps = {
  onClose: () => void;
};

export const UserProfile = ({ onClose }: UserProfileProps) => {
  const { username, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    apiFetch<Profile>("/api/auth/profile")
      .then(setProfile)
      .catch(() => {});
  }, []);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match" });
      return;
    }

    setChangingPassword(true);
    try {
      await apiFetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setPasswordMsg({ type: "success", text: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to change password" });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-3xl border border-[var(--stroke)] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg font-semibold text-[var(--dark-teal)]">Profile</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--gray-text)] transition hover:bg-gray-100 hover:text-[var(--dark-teal)]"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Profile info */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--accent-turquoise)]/10 text-xl font-bold text-[var(--accent-turquoise)]">
            {username?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-[var(--dark-teal)]">{username}</p>
            {profile && (
              <p className="text-xs text-[var(--gray-text)]">
                Member since {new Date(profile.created_at).toLocaleDateString()} &middot; {profile.board_count} boards
              </p>
            )}
          </div>
        </div>

        {/* Change password */}
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent-turquoise)]"
              required
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent-turquoise)]"
              required
              minLength={6}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent-turquoise)]"
              required
              minLength={6}
            />
            {passwordMsg && (
              <p className={`text-xs ${passwordMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
                {passwordMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full rounded-full bg-[var(--accent-turquoise)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-40"
            >
              {changingPassword ? "Changing..." : "Change Password"}
            </button>
          </form>
        </div>

        {/* Sign out */}
        <div className="mt-6 border-t border-[var(--stroke)] pt-4">
          <button
            onClick={logout}
            className="w-full rounded-full border border-red-200 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-red-500 transition hover:bg-red-50"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
